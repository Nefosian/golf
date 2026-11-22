package game

import (
	"container/heap"
	"fmt"
	"math"
	"math/bits"
	"slices"

	"trounormand/internal/physics"
)

// Verify plays a hole the way players would, with the real engine and the real rules, and says
// whether it is fit to be played: tools/verify runs it on every hole.
//
//  1. The way: a series of shots that holes the ball within par, from the tee. From every place a
//     ball comes to rest the search tries shots at the cup, at each zone, then all around (72
//     directions, 6 strengths), and where moving colliders are, the aimed ones again after waiting
//     for them. If it finds none, players would not either: the hole is refused.
//  2. No trap: from every place a ball came to rest, a series of shots that leads back to a place
//     known to finish. A place with none, even after a dense fan of shots (360 x 20), is a trap.
//  3. Coverage: a fixed number of shots more, from the tee first, then from the places farthest from
//     those already tried, so that the traps and the faults below have a chance to show.
//  4. Faults: every frame of every shot is watched (see Meaning); one is enough to refuse the hole,
//     with the shots that show it. And every zone that acts on entering must have acted once.
//
// Places closer than cell across and layer in height are one: a ball standing for each. Shots leave
// on the frames the game plays. Everything is played in a fixed order: the same hole and the same
// code always give the same answer.

const (
	cell        = 0.5     // places a ball rests on closer than this across are one...
	layer       = 0.05    // ...and closer than this in height: a ball in a pit is not one on its edge
	budget      = 200_000 // shots for the way and the ways out together: the hardest hole known takes 25 000
	coverage    = 5_000   // shots more, for the traps and the faults to show
	denseAngles = 360     // the fan a place with no way out is tried with again
	densePowers = 20
	rolls       = 30 * physics.FPS // a shot rolling this long reached the safety net
	react       = 2 * physics.FPS  // a ball put back after a penalty must stay this long, for its player to shoot it
)

// Shot is a shot of a player: on frame Frame of the hole, towards (sin Angle, cos Angle), at Power.
type Shot struct {
	Frame        int
	Angle, Power float64
}

// String gives the shot exactly (a tenth of a degree off can be another shot): the angle in radians,
// and roughly in degrees for whoever reads it.
func (s Shot) String() string {
	return fmt.Sprintf("{frame %d, angle %v rad (%.1f°), power %v}", s.Frame, s.Angle, s.Angle*180/math.Pi, s.Power)
}

// Fault is something wrong the verifier saw: what, where, how often, and how to see it again.
type Fault struct {
	Kind   string       // one of the kinds below
	Detail string       // the zone or collider, how deep...
	At     physics.Vec3 // where the ball was
	Count  int          // shots it was seen on
	Shots  []Shot       // from the tee, played each once the ball is at rest: they show it
}

// The kinds of faults: those of the engine, watched on every frame, then those of the hole.
const (
	ZoneMissed  = "zone-missed"
	InsideWall  = "inside-wall"
	ThroughWall = "through-wall"
	SafetyNet   = "safety-net"
	PenaltyLoop = "penalty-loop"
	BadNumber   = "bad-number"
	ZoneUnused  = "zone-unused"
	Trap        = "trap"
	NoWay       = "no-way"
	Unchecked   = "unchecked"
)

// Meaning says what each kind of fault is, for whoever reads a report.
var Meaning = map[string]string{
	ZoneMissed:  "the ball went into a zone that acts on entering, and it did not act",
	InsideWall:  "the center of the ball got inside a collider, still or moving",
	ThroughWall: "the ball went through a still collider between two frames",
	SafetyNet:   "a shot rolled for 30 s, until the safety net stopped it",
	PenaltyLoop: "a ball put back after a penalty gets another one before its player can shoot it: out for ever",
	BadNumber:   "a position or a speed out of bounds (not a number, or faster than the fastest a ball goes)",
	ZoneUnused:  "a zone that acts on entering never acted: a ball cannot get into it",
	Trap:        "a place a ball can come to rest on, with no way to the cup from it",
	NoWay:       "no way to the cup within par was found: players would not find one either",
	Unchecked:   "some places could not be checked within the budget",
}

// Report is the verdict on a hole.
type Report struct {
	Hole    string
	OK      bool
	Way     []Shot // the way found within par, when there is one
	Strokes int    // it takes
	Par     int
	Places  int // distinct places a ball came to rest on
	Unknown int // places whose way out the budget did not allow to look for
	Shots   int // simulated
	Faults  []Fault
}

// player plays one ball alone on a hole, and watches every frame.
type player struct {
	w      *physics.World
	ev     []event
	shots  int
	faults map[string]*Fault
	order  []string // kinds in the order first seen
	acted  uint64   // zones that acted, on any shot
	chain  []Shot   // the shots before the one being played, to show a fault again
}

func newPlayer(h *physics.Hole) *player {
	return &player{w: physics.NewWorld(h), faults: map[string]*Fault{}}
}

// saw records a fault of the shot being played (once per shot and kind).
func (p *player) saw(seen map[string]bool, kind, detail string, at physics.Vec3, s Shot) {
	if seen[kind] {
		return
	}
	seen[kind] = true
	f := p.faults[kind]
	if f == nil {
		f = &Fault{Kind: kind, Detail: detail, At: at, Shots: append(append([]Shot{}, p.chain...), s)}
		p.faults[kind] = f
		p.order = append(p.order, kind)
	}
	f.Count++
}

// start puts a ball on pos, as a hole starts.
func (p *player) start(pos physics.Vec3) (golfer, int) {
	g := golfer{ball: physics.NewBall(pos), limit: 1000} // the search counts the strokes itself
	p.w.Settle(&g.ball, 0)
	k := 0
	for !g.ball.Rest && k < rolls {
		k++
		p.w.Advance(&g.ball, k)
		p.ev = rules(p.w, &g, k, 0, p.ev[:0])
		p.w.Events = p.w.Events[:0]
	}
	return g, k
}

// shoot plays a shot of g, watching every frame, until the ball is in the cup or at rest where
// nothing will move it any more. It returns the ball and the frame it is on then.
func (p *player) shoot(g golfer, s Shot) (golfer, int) {
	h, w := p.w.Hole, p.w
	seen := map[string]bool{}
	g.ball.Respawn = g.ball.P
	g.ball.Shoot(math.Sin(s.Angle), math.Cos(s.Angle), s.Power)
	g.strokes++
	p.shots++
	k, putBack := s.Frame, -1 // the frame the ball was last put back on, after a penalty
	restFrom := -1
	for {
		k++
		b := &g.ball
		if restFrom >= 0 && b.Rest && b.WakeAt != physics.NoWake && b.WakeAt > k {
			k = min(b.WakeAt, restFrom+rolls) // at rest: nothing happens until a moving collider may reach it
		}
		from, wasRest, wasIn := b.P, b.Rest, h.ZonesAt(b)
		w.Advance(b, k)
		var fired uint64
		jumped := false
		for _, e := range w.Events {
			if e.Kind == physics.Entered || e.Kind == physics.Teleported {
				fired |= 1 << e.Ref
			}
			jumped = jumped || e.Kind == physics.Teleported
		}
		p.acted |= fired
		if sp := math.Sqrt(b.V.X*b.V.X + b.V.Y*b.V.Y + b.V.Z*b.V.Z); !finite(b.P) || !finite(b.V) || sp > physics.MaxSpeed+1e-4 {
			p.saw(seen, BadNumber, fmt.Sprintf("position %v, speed %.3f", b.P, sp), b.P, s)
			return g, k
		}
		// a ball at rest at the start of the frame is still watched: a moving collider may come on it
		inside := false
		if !b.Holed && !g.finished {
			if d, c := h.DepthAt(b.P, b.Keys, float64(k)*physics.Tick); d > physics.BallR+0.02 {
				inside = true
				p.saw(seen, InsideWall, fmt.Sprintf("collider %d, %.3f deep", c, d-physics.BallR), b.P, s)
			}
		}
		if !b.Holed && !g.finished && !wasRest {
			// in a zone it was not in, that did not act though it had something to do
			for in, z := h.ZonesAt(b)&^wasIn&^fired, 0; in != 0; in, z = in>>1, z+1 {
				if in&1 != 0 && h.Zones[z].WouldAct(b) {
					p.saw(seen, ZoneMissed, fmt.Sprintf("zone %d %s", z, h.Zones[z].Type), b.P, s)
					break
				}
			}
			if !inside && !jumped {
				// the straight line it went along this frame, through the still colliders
				for i := 1; i < 8; i++ {
					f := float64(i) / 8
					q := physics.Vec3{X: from.X + (b.P.X-from.X)*f, Y: from.Y + (b.P.Y-from.Y)*f, Z: from.Z + (b.P.Z-from.Z)*f}
					if d, c := h.DepthAt(q, b.Keys, -1); d > physics.BallR+0.05 {
						p.saw(seen, ThroughWall, fmt.Sprintf("collider %d", c), q, s)
						break
					}
				}
			}
		}
		if b.Stuck || restFrom < 0 && k-s.Frame >= rolls {
			p.saw(seen, SafetyNet, "", b.P, s)
		}
		p.ev = rules(w, &g, k, 0, p.ev[:0])
		w.Events = w.Events[:0]
		// A penalty puts the ball back where it was shot from, or on the last checkpoint. An obstacle
		// may throw a ball out, that is the map's choice; but a ball put back where it is thrown out
		// again before its player can shoot is out for ever.
		for _, e := range p.ev {
			if e.kind != evOut {
				continue
			}
			if putBack >= 0 && k-putBack < react {
				p.saw(seen, PenaltyLoop, fmt.Sprintf("put back on (%.2f, %.2f, %.2f), out again %.1f s later", b.P.X, b.P.Y, b.P.Z, float64(k-putBack)/physics.FPS), b.P, s)
			}
			putBack = k
		}
		switch {
		case g.finished:
			return g, k
		case b.Rest && restFrom < 0:
			restFrom = k
		}
		if restFrom >= 0 {
			// at rest for good, or as long as a moving collider can take to come by
			if b.Rest && (b.WakeAt == physics.NoWake || k-restFrom >= rolls) {
				return g, k
			}
		}
		if k-s.Frame > 4*rolls {
			p.saw(seen, SafetyNet, "never settles", b.P, s)
			return g, k
		}
	}
}

func finite(v physics.Vec3) bool { s := v.X + v.Y + v.Z; return !math.IsNaN(s) && !math.IsInf(s, 0) }

// node is a ball at rest the search reached, and how.
type node struct {
	g      golfer
	k      int
	parent int // node, -1 for the tee
	via    Shot
	place  int
	far    float64 // distance to the nearest ball of its kind already shot from
}

// place is the balls at rest within cell of each other, holding the same keys and once-zones: one
// of them (rep) stands for all.
type place struct {
	rep    int
	next   int  // shots of its fan played
	done   bool // its whole fan was played
	dense  bool // and the dense fan too
	finish bool // a series of shots known from here holes
	from   []int
}

type spot struct {
	x, y, z int32
	keys    uint8
	taken   uint64
}

type item struct {
	cost float64
	node int
}

type queue []item

func (q queue) Len() int { return len(q) }
func (q queue) Less(i, j int) bool {
	if q[i].cost != q[j].cost {
		return q[i].cost < q[j].cost
	}
	return q[i].node < q[j].node
}
func (q queue) Swap(i, j int) { q[i], q[j] = q[j], q[i] }
func (q *queue) Push(v any)   { *q = append(*q, v.(item)) }
func (q *queue) Pop() any {
	o := *q
	v := o[len(o)-1]
	*q = o[:len(o)-1]
	return v
}

// kind is the balls of the search holding the same keys and once-zones: the kinds take turns, so
// that a key behind the tee is looked for as much as the way to the cup.
type kind struct {
	near queue // the balls, nearest to the cup first (a stroke is worth strokeWorth units)
	open []int // the balls not shot from yet
	shot []physics.Vec3
	turn int
}

const strokeWorth = 6

type verifier struct {
	h      *physics.Hole
	p      *player
	nodes  []node
	places []place
	index  map[spot]int
	kinds  []*kind
	kindOf map[[2]uint64]int
	cup    physics.Vec3
	search bool  // the way is looked for: a ball reached in fewer strokes stands for its place
	bound  int   // a ball with this many strokes is not shot from in the search
	waits  []int // frames a player may wait before shooting, over the period of the moving colliders
}

// Verify gives the verdict on h.
func Verify(h *physics.Hole) Report {
	v := &verifier{h: h, p: newPlayer(h), index: map[spot]int{}, kindOf: map[[2]uint64]int{},
		cup: physics.Vec3{X: h.Cup.X, Y: h.Cup.Y + physics.BallR, Z: h.Cup.Z}, bound: h.Par}
	for i := range h.Zones {
		if h.Zones[i].Type == "strokes" { // a zone may give a stroke back
			v.bound = h.StrokeLimit()
		}
	}
	// A player may wait for a moving collider to be out of the way (a door that opens now and
	// then): the shots aimed at the cup and the zones are also tried after each wait, a second
	// apart at most, over the longest period.
	period := 0.0
	for i := range h.Colliders {
		if m := h.Colliders[i].Motion; m != nil {
			period = max(period, m.Period)
		}
	}
	if period > 0 {
		step := max(pathStep, min(physics.FPS, int(period*physics.FPS)/8)/pathStep*pathStep)
		for d := step; d < int(period*physics.FPS); d += step {
			v.waits = append(v.waits, d)
		}
	}
	r := Report{Hole: h.Name, Par: h.Par}
	g0, k0 := v.p.start(h.Tee)
	v.search = true
	v.arrive(g0, k0, -1, Shot{})

	// 1. the way
	turn := 0
	for r.Way == nil && v.p.shots < budget {
		n := v.pick(&turn)
		if n < 0 {
			break
		}
		pl := v.nodes[n].place
		fan := v.fan(pl)
		for v.places[pl].rep == n && v.places[pl].next < len(fan) && r.Way == nil && v.p.shots < budget {
			s := fan[v.places[pl].next]
			v.places[pl].next++
			if g, to := v.fire(pl, s); to == endHoled && g.strokes <= h.Par {
				r.Way, r.Strokes = append(v.chain(n), s), g.strokes
			}
		}
		if v.places[pl].rep == n {
			v.places[pl].done = v.places[pl].next == len(fan)
		}
	}
	v.search = false
	if r.Way == nil {
		r.Shots, r.Places = v.p.shots, len(v.places)
		r.Faults = append(v.faults(), Fault{Kind: NoWay, Detail: fmt.Sprintf("no way to the cup within par %d found in %d shots", h.Par, v.p.shots)})
		return r
	}

	// 2. a way out of every place reached; 3. coverage, then ways out of what it found
	v.ways()
	cover, turn := 0, 0
	for first := true; cover < coverage; first = false {
		pl := v.nextCover(first, &turn)
		if pl < 0 {
			break
		}
		fan := v.fan(pl)
		for v.places[pl].next < len(fan) && cover < coverage {
			s := fan[v.places[pl].next]
			v.places[pl].next++
			v.fire(pl, s)
			cover++
		}
		v.places[pl].done = v.places[pl].next == len(fan)
	}
	v.ways()

	// the places with no way out known: tried again with the dense fan; the first that still has
	// none is a trap. Only once every place was looked at: a place whose shots lead to a place not
	// looked at yet is not a trap.
	unknown := func() (n int) {
		for i := range v.places {
			if !v.places[i].finish && !v.places[i].done {
				n++
			}
		}
		return n
	}
	var trap *Fault
	for i := 0; i < len(v.places) && trap == nil && unknown() == 0 && v.p.shots < budget; i++ {
		pl := &v.places[i]
		if pl.finish || !pl.done || pl.dense {
			continue
		}
		pl.dense = true
		k := v.nodes[pl.rep].k
		for a := 0; a < denseAngles && !v.places[i].finish && v.p.shots < budget; a++ {
			for f := 1; f <= densePowers && !v.places[i].finish && v.p.shots < budget; f++ {
				v.fire(i, Shot{k, float64(a) * 2 * math.Pi / denseAngles, float64(f) / densePowers})
			}
		}
		v.ways()
		if !v.places[i].finish && unknown() == 0 && v.p.shots < budget {
			rep := v.nodes[v.places[i].rep]
			trap = &Fault{Kind: Trap, Detail: "no way to the cup from there", At: rep.g.ball.P, Count: 1, Shots: v.chain(v.places[i].rep)}
		}
	}
	r.Unknown = unknown()
	r.Shots, r.Places, r.Faults = v.p.shots, len(v.places), v.faults()
	for i := range h.Zones {
		if z := &h.Zones[i]; z.ActsOnEntering() && v.p.acted&(1<<i) == 0 {
			r.Faults = append(r.Faults, Fault{Kind: ZoneUnused, Detail: fmt.Sprintf("zone %d %s: no shot of the %d made it act (out of reach, or never entered)", i, z.Type, v.p.shots), At: z.C})
		}
	}
	if trap != nil {
		r.Faults = append(r.Faults, *trap)
	}
	if r.Unknown > 0 {
		r.Faults = append(r.Faults, Fault{Kind: Unchecked, Detail: fmt.Sprintf("%d places whose way out the %d shots did not allow to look for", r.Unknown, budget)})
	}
	r.OK = len(r.Faults) == 0
	return r
}

func (v *verifier) faults() []Fault {
	var out []Fault
	for _, k := range v.p.order {
		out = append(out, *v.p.faults[k])
	}
	return out
}

const endHoled, endMoving = -1, -2 // where a shot ends, when not on a place

// fire plays a shot of the ball that stands for place pl; it returns the ball and where it ended.
func (v *verifier) fire(pl int, s Shot) (golfer, int) {
	n := v.places[pl].rep
	v.p.chain = v.chain(n)
	g, k := v.p.shoot(v.nodes[n].g, s)
	switch {
	case g.ball.Holed:
		v.finishes(pl)
		return g, endHoled
	case g.finished || !g.ball.Rest:
		return g, endMoving
	}
	to := v.arrive(g, k, n, s)
	if v.places[to].finish {
		v.finishes(pl)
	} else if to != pl {
		v.places[to].from = append(v.places[to].from, pl)
	}
	return g, to
}

// finishes marks pl, and every place a shot from which leads to it, as places that finish.
func (v *verifier) finishes(pl int) {
	todo := []int{pl}
	for len(todo) > 0 {
		p := &v.places[todo[len(todo)-1]]
		todo = todo[:len(todo)-1]
		if !p.finish {
			p.finish = true
			todo = append(todo, p.from...)
		}
	}
}

// arrive is the place of a ball at rest, made when new.
func (v *verifier) arrive(g golfer, k, parent int, via Shot) int {
	b := &g.ball
	kk := spot{int32(math.Floor(b.P.X / cell)), int32(math.Floor(b.P.Y / layer)), int32(math.Floor(b.P.Z / cell)), b.Keys, b.Taken}
	pl, ok := v.index[kk]
	if ok && !(v.search && g.strokes < v.nodes[v.places[pl].rep].g.strokes) {
		return pl
	}
	v.nodes = append(v.nodes, node{g: g, k: k, parent: parent, via: via})
	n := len(v.nodes) - 1
	if !ok {
		v.places = append(v.places, place{rep: n})
		pl = len(v.places) - 1
		v.index[kk] = pl
	} else {
		p := &v.places[pl]
		p.rep, p.done, p.next = n, false, 0
	}
	v.nodes[n].place = pl
	if v.search && g.strokes < v.bound {
		c := v.kind(&g.ball)
		heap.Push(&c.near, item{float64(g.strokes)*strokeWorth + dist(b.P, v.cup), n})
		v.nodes[n].far = math.Inf(1)
		for _, at := range c.shot {
			v.nodes[n].far = min(v.nodes[n].far, dist(at, b.P))
		}
		c.open = append(c.open, n)
	}
	return pl
}

// kindKey is what tells the kinds of balls apart: the keys they hold and the once-zones they took.
func kindKey(b *physics.Ball) [2]uint64 { return [2]uint64{uint64(b.Keys), b.Taken} }

func (v *verifier) kind(b *physics.Ball) *kind {
	kk := kindKey(b)
	i, ok := v.kindOf[kk]
	if !ok {
		i = len(v.kinds)
		v.kindOf[kk] = i
		v.kinds = append(v.kinds, &kind{})
	}
	return v.kinds[i]
}

// pick is the next ball to shoot from in the search for the way: the kinds take turns; in a kind,
// the ball nearest to the cup and the ball farthest from those already shot from take turns.
func (v *verifier) pick(turn *int) int {
	stale := func(n int) bool {
		p := &v.places[v.nodes[n].place]
		return p.rep != n || p.done || p.next > 0
	}
	for tries := 0; tries < len(v.kinds); tries++ {
		c := v.kinds[*turn%len(v.kinds)]
		*turn++
		c.turn++
		found := -1
		for way := 0; way < 2 && found < 0; way++ {
			if (c.turn+way)%2 == 1 {
				for c.near.Len() > 0 && found < 0 {
					if it := heap.Pop(&c.near).(item); !stale(it.node) {
						found = it.node
					}
				}
				continue
			}
			best, keep := math.Inf(-1), c.open[:0]
			for _, n := range c.open {
				if stale(n) {
					continue
				}
				keep = append(keep, n)
				if s := v.nodes[n].far - strokeWorth*float64(v.nodes[n].g.strokes); s > best {
					best, found = s, n
				}
			}
			c.open = keep
		}
		if found >= 0 {
			at := v.nodes[found].g.ball.P
			c.shot = append(c.shot, at)
			for _, n := range c.open {
				v.nodes[n].far = min(v.nodes[n].far, dist(at, v.nodes[n].g.ball.P))
			}
			return found
		}
	}
	return -1
}

// nextCover is the next place to play the whole fan of: the tee's, then, the kinds in turn, the
// place farthest from those whose fan was played.
func (v *verifier) nextCover(first bool, turn *int) int {
	if first && !v.places[0].done {
		return 0
	}
	type group struct{ open, done []int }
	var order [][2]uint64
	by := map[[2]uint64]*group{}
	for i := range v.places {
		kk := kindKey(&v.nodes[v.places[i].rep].g.ball)
		gr := by[kk]
		if gr == nil {
			gr = &group{}
			by[kk] = gr
			order = append(order, kk)
		}
		if v.places[i].done {
			gr.done = append(gr.done, i)
		} else {
			gr.open = append(gr.open, i)
		}
	}
	for tries := 0; tries < len(order); tries++ {
		gr := by[order[*turn%len(order)]]
		*turn++
		best, found := -1.0, -1
		for _, i := range gr.open {
			at, m := v.nodes[v.places[i].rep].g.ball.P, math.Inf(1)
			for _, j := range gr.done {
				m = min(m, dist(at, v.nodes[v.places[j].rep].g.ball.P))
			}
			if m > best {
				best, found = m, i
			}
		}
		if found >= 0 {
			return found
		}
	}
	return -1
}

// ways plays the fan of every place not known to finish, until it does or its fan is over, within
// the budget. The places holding the most keys and once-zones go first: they are nearest to the end
// of the hole, and once they finish, the places whose shots lead to them do too (with keys in the
// order found, the work doubles with each key).
func (v *verifier) ways() {
	for {
		var todo []int
		for i := range v.places {
			if !v.places[i].finish && !v.places[i].done {
				todo = append(todo, i)
			}
		}
		if len(todo) == 0 || v.p.shots >= budget {
			return
		}
		held := func(i int) int {
			b := &v.nodes[v.places[i].rep].g.ball
			return bits.OnesCount8(b.Keys) + bits.OnesCount64(b.Taken)
		}
		slices.SortStableFunc(todo, func(a, b int) int { return held(b) - held(a) })
		for _, i := range todo {
			fan := v.fan(i)
			for v.places[i].next < len(fan) && !v.places[i].finish && v.p.shots < budget {
				s := fan[v.places[i].next]
				v.places[i].next++
				v.fire(i, s)
			}
			v.places[i].done = v.places[i].next == len(fan)
		}
	}
}

// fan is the shots tried from a place: at the cup (15 strengths), at every zone but the hazards (6),
// then all around (72 directions, 6 strengths); then, where nothing moves the ball while it
// waits, the aimed ones again after each wait. A shot leaves on a frame the game plays (a path
// step: the server shoots on those only).
func (v *verifier) fan(pl int) []Shot {
	n := &v.nodes[v.places[pl].rep]
	at, k := n.g.ball.P, n.k
	still := n.g.ball.WakeAt == physics.NoWake // nothing will move it: it is the same ball later
	if r := k % pathStep; r != 0 && (still || n.g.ball.WakeAt > k+pathStep-r) {
		k += pathStep - r
	}
	aims := []physics.Vec3{v.cup}
	for i := range v.h.Zones {
		if z := &v.h.Zones[i]; z.Type != "hazard" {
			aims = append(aims, z.C)
		}
	}
	var out, aimed []Shot
	for i, a := range aims {
		powers := []float64{0.15, 0.3, 0.45, 0.6, 0.8, 1}
		if i == 0 {
			powers = []float64{0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1}
		}
		for _, pw := range powers {
			aimed = append(aimed, Shot{k, math.Atan2(a.X-at.X, a.Z-at.Z), pw})
		}
	}
	out = append(out, aimed...)
	for a := 0; a < 72; a++ {
		for _, pw := range []float64{0.15, 0.3, 0.45, 0.6, 0.8, 1} {
			out = append(out, Shot{k, float64(a) * 2 * math.Pi / 72, pw})
		}
	}
	if still {
		for _, d := range v.waits {
			for _, s := range aimed {
				s.Frame += d
				out = append(out, s)
			}
		}
	}
	return out
}

// chain is the shots that took the ball from the tee to node n.
func (v *verifier) chain(n int) []Shot {
	var s []Shot
	for ; v.nodes[n].parent >= 0; n = v.nodes[n].parent {
		s = append(s, v.nodes[n].via)
	}
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
	return s
}
