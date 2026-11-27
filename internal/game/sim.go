package game

import (
	"cmp"
	"math"
	"slices"

	"trounormand/internal/physics"
)

const (
	holedFreeze = 90 // frames a holed ball keeps rattling in the cup before it is frozen

	pathStep  = 2                // frames between two positions of a path: 30 per second
	pathAhead = 20 * physics.FPS // frames the tracks go ahead at most; what follows is computed later
	lead      = physics.FPS      // frames before the end of the tracks that what follows is computed: the players have it before they need it

	never = physics.NoWake // a frame that does not come, also the WakeAt of a ball nothing will move
)

// golfer is a player's ball on the hole, and what the game knows of it.
type golfer struct {
	ball     physics.Ball
	strokes  int
	limit    int // of strokes, on this hole
	finished bool
	holedAt  int // frame

	powersOn bool     // the room plays with powers (powers.go)
	powers   [2]uint8 // in hand, powNone where there is none
	armed    uint8    // the power the next shot carries
	curse    uint8    // what the others' powers did to the next shot (curseWeight...)
}

// still says whether a ball stays as it is until another ball or a moving collider moves it.
func still(g *golfer) bool {
	b := &g.ball
	return b.Frozen || (b.Rest && !b.Holed && (g.finished || g.strokes < g.limit))
}

// wakes is the frame a moving collider may move a still ball on, or never.
func wakes(g *golfer) int {
	if g.ball.Frozen || !g.ball.Rest {
		return never
	}
	return g.ball.WakeAt
}

// known says whether all of a track is known: its ball stays as it is until another ball moves it.
func known(g *golfer) bool { return still(g) && wakes(g) == never }

// moving is what keeps a hole from ending.
func moving(g *golfer) bool { return !g.ball.Rest && !g.ball.Frozen }

// solid says whether other balls bounce off this one.
func solid(g *golfer) bool { return g.ball.Collides() }

// ball is a player's ball in a sim.
type ball struct {
	id    uint32 // of the player
	track track

	// What the players were told: where it is every pathStep frames from frame toldAt on (it stays
	// on the last one), and its flags once there.
	told   []pose
	toldAt int
	flags  uint8

	// scratch of replan and play
	playFrom int  // first frame replan plays it on (never: it keeps its track)
	replayed int  // first frame of its track replan played again
	changed  bool // its track changed: the players may have to hear of it
	inSet    bool
	group    int  // index in sim.sorted of the first ball of its group
	prev     pose // on the frame before the one played
	before   golfer
	after    golfer
	events   []event
	met      []uint32
	jumps    []physics.Vec3 // where it left and where it came out, for each teleporter it went through
	exits    []physics.Vec3 // where it may come out of a teleporter on the frame played
}

// sim is a hole being played: a track per ball, each computed ahead once (see replan). It knows
// the players by their id only.
type sim struct {
	hole     *physics.Hole
	limit    int  // of strokes, for every ball
	solo     bool // the balls go through each other
	powers   bool // the players have powers (powers.go)
	world    *physics.World
	seq      int          // of the hole: paths of a previous hole are ignored
	balls    []*ball      // in the order of the room's members
	now      int          // the frame the hole is on: the events up to it are applied, the tracks start there
	until    int          // frame up to which the tracks of the balls that still move are known
	toldUpTo int          // frame of the last event the players were told of
	send     func([]byte) // to every player of the room

	set    []*ball         // scratch of replan
	sorted []*ball         // scratch of play
	phys   []*physics.Ball // scratch of play
	drop   []event         // scratch of state
	passed []event         // scratch of advance
}

func newSim(hole *physics.Hole, seq int, send func([]byte), limit int, solo, powers bool) *sim {
	return &sim{hole: hole, limit: limit, solo: solo, powers: powers, world: physics.NewWorld(hole), seq: seq, send: send}
}

func (s *sim) ball(id uint32) *ball {
	for _, b := range s.balls {
		if b.id == id {
			return b
		}
	}
	return nil
}

// add puts b on the tee, not shot yet: no ball goes any other way for it.
func (s *sim) add(b *ball) {
	g := golfer{ball: physics.NewBall(s.hole.Tee), limit: s.limit, powersOn: s.powers}
	if s.powers { // a power in hand on every hole
		g.give(drawPower(s.now+s.seq*7919, b.id, 99))
	}
	s.world.Settle(&g.ball, s.now)
	b.track.restart(s.now, g)
	b.told, b.toldAt, b.flags = append(b.told[:0], see(&b.track.last)), s.now, 0
	s.balls = append(s.balls, b)
}

// remove takes a ball off the hole: the balls it was going to meet go otherwise.
func (s *sim) remove(id uint32) {
	s.balls = slices.DeleteFunc(s.balls, func(b *ball) bool { return b.id == id })
	s.replan(s.now, nil)
}

// shoot plays a shot of b on frame n, if it can be shot, and tells the players.
func (s *sim) shoot(b *ball, n int, dx, dz, power float64) bool {
	g := s.state(b, n)
	if g.finished || !g.ball.Rest || g.ball.Holed {
		return false
	}
	g.ball.Respawn = g.ball.P
	g.ball.Shoot(dx, dz, g.arm(power))
	g.powered()
	g.strokes++
	b.track.restart(n, g)
	s.replan(n, []*ball{b}, event{n, b.id, evShot, float32(min(1, power))})
	return true
}

// giveUp ends the hole for b on frame n, if it has not finished it: it counts its stroke limit and
// stays where it is, a ghost the other balls go through. The players are told.
func (s *sim) giveUp(b *ball, n int) bool {
	g := s.state(b, n)
	if g.finished {
		return false
	}
	g.finished, g.strokes = true, g.limit
	g.ball.V, g.ball.Rest, g.ball.Frozen, g.ball.Solid = physics.Vec3{}, true, true, false
	b.track.restart(n, g)
	s.replan(n, []*ball{b}, event{n, b.id, evGaveUp, float32(g.limit)})
	return true
}

// advance brings the hole to frame n: what follows the tracks is computed when they are about to
// run out, and what is past is forgotten. It returns the events that change the scores up to n.
func (s *sim) advance(n int) []event {
	// as many times as it takes: the room may have slept longer than the tracks go. Never from
	// before now: until is left behind while everything stays still, and what is past is not played again.
	for s.rolling() && n >= s.until-lead {
		s.replan(max(s.now, min(n, s.until)), nil)
	}
	passed := s.passed[:0]
	for _, b := range s.balls {
		t := &b.track
		i := 0
		for ; i < len(t.events) && t.events[i].frame <= n; i++ {
			if scoring(t.events[i].kind) {
				passed = append(passed, t.events[i])
			}
		}
		t.events = t.events[:copy(t.events, t.events[i:])]
		t.trim(n)
	}
	s.passed, s.now = passed, n
	return passed
}

// scoring says whether an event changes what the room shows of the players.
func scoring(kind uint8) bool {
	return kind == evHoled || kind == evMaxed || kind == evOut || kind == evStrokes || kind == evPowerGot
}

// rolling says whether a track goes further than what is known of it.
func (s *sim) rolling() bool {
	for _, b := range s.balls {
		if !known(&b.track.last) {
			return true
		}
	}
	return false
}

// replan computes the tracks again from frame n0, on which the changed balls start anew from the
// state their track now gives (a shot). Every other ball keeps its track until something that
// changed reaches it: a ball that comes near it, or a ball it had met. The tracks still moving
// are taken further, up to n0 + pathAhead. Then the players are told, with input: the events of
// n0 that caused it.
//
// It plays only the balls that may come out otherwise, with play, which makes each ball depend on
// nothing but the balls it meets: the tracks come out the same as if every ball had been played.
func (s *sim) replan(n0 int, changed []*ball, input ...event) {
	until := n0 + pathAhead
	for _, b := range s.balls {
		b.playFrom, b.replayed, b.changed = never, never, false
		switch t := &b.track; {
		case !still(&t.last) && t.end() < until:
			b.playFrom, b.changed = t.end()+1, true // what comes next for it
		case still(&t.last) && wakes(&t.last) <= until:
			b.playFrom, b.changed = max(t.end()+1, wakes(&t.last)), true // a moving collider may move it
		}
	}
	for _, b := range changed {
		b.playFrom, b.replayed, b.changed = n0+1, n0+1, true
	}
	k := s.stale(n0 + 1)
	for _, b := range s.balls {
		k = min(k, b.playFrom)
	}
	// the first stale link from staleFrom on: it holds until it is passed or a track is played again
	stale, staleFrom := never, never
	for k <= until {
		changes, plays, rolls := false, false, false
		for _, b := range s.balls {
			b.inSet, b.prev, b.exits = false, b.track.at(k-1), b.exits[:0]
			switch {
			case b.playFrom <= k:
				changes = true
				plays = plays || !b.prev.is(bitStill) || wakes(&b.track.last) <= k
			case !b.prev.is(bitStill):
				rolls = true
			}
		}
		if staleFrom > k || stale < k {
			stale, staleFrom = s.stale(k), k
		}
		if !plays && !(changes && rolls) && stale != k {
			// nothing can come out otherwise before the next ball to play, the next stale link, or
			// the next ball a moving collider may move
			next := stale
			for _, b := range s.balls {
				if b.playFrom > k {
					next = min(next, b.playFrom)
				} else {
					next = min(next, wakes(&b.track.last))
				}
			}
			k = next
			continue
		}

		// Who to play: the changed balls, any ball whose track met a ball that changed or went,
		// then on and on every ball near one of them: a ball that comes out otherwise may hit any
		// ball within its reach (and the balls a track met were all near it).
		set := s.set[:0]
		add := func(b *ball) {
			if !b.inSet {
				b.inSet, set = true, append(set, b)
			}
		}
		for _, b := range s.balls {
			if b.playFrom <= k {
				add(b)
				continue
			}
			links := b.track.links
			for i, _ := slices.BinarySearchFunc(links, k, func(l link, k int) int { return cmp.Compare(l.frame, k) }); i < len(links) && links[i].frame == k; i++ {
				if s.invalid(links[i]) {
					add(b)
				}
			}
		}
		if s.hole.Teleports() {
			for _, b := range s.balls {
				b.exits = s.hole.Exits(b.prev.vec(), b.exits[:0])
			}
		}
		for i := 0; !s.solo && i < len(set); i++ {
			if b := set[i]; b.prev.is(bitSolid) {
				for _, o := range s.balls {
					if !o.inSet && o.prev.is(bitSolid) && meetable(b, o) {
						add(o)
					}
				}
			}
		}
		s.set = set
		for _, b := range set {
			b.before = s.state(b, k-1)
		}

		s.play(k, set)
		for _, b := range set {
			t := &b.track
			switch {
			case b.playFrom <= k:
				if b.after != b.before || !still(&b.before) || len(b.events) > 0 || len(b.met) > 0 {
					t.put(k, b.after, b.events, b.met)
				}
			case b.after == s.state(b, k):
				t.redo(k, b.after, b.events, b.met) // same ball, maybe other bounces or other balls met
			default:
				// it goes otherwise from here: its track is played again from now on
				t.diverge(k, b.after, b.events, b.met)
				b.playFrom, b.replayed, b.changed = k+1, k, true
				staleFrom = never // links to it may be stale now
			}
		}
		k++
	}
	s.until = until
	s.tell(n0, false, input...)
}

// near says whether two balls can meet on the frame that starts with them on a and b.
func near(a, b physics.Vec3) bool {
	const d = 2*physics.BallR + 2*physics.Reach + 1e-3 // and what rounding the positions to float32 may take away
	dx, dy, dz := a.X-b.X, a.Y-b.Y, a.Z-b.Z
	return dx*dx+dy*dy+dz*dz < d*d
}

// meetable says whether two balls can meet on the frame that starts with them on prev, maybe
// after one of them went through a teleporter (their exits).
func meetable(a, b *ball) bool {
	pa, pb := a.prev.vec(), b.prev.vec()
	if near(pa, pb) {
		return true
	}
	for _, e := range a.exits {
		if near(e, pb) {
			return true
		}
		for _, f := range b.exits {
			if near(e, f) {
				return true
			}
		}
	}
	for _, f := range b.exits {
		if near(f, pa) {
			return true
		}
	}
	return false
}

// meets says whether two balls played on their own on a frame met on the way: their straight
// lines across the frame touch. A ball that went through a teleporter has a line per piece, and
// pieces are judged on the spheres around them, which is more than enough.
func meets(a, b *ball) bool {
	if len(a.jumps) == 0 && len(b.jumps) == 0 {
		_, ok := physics.Meet(a.before.ball.P, a.after.ball.P, b.before.ball.P, b.after.ball.P)
		return ok
	}
	for i := 0; i <= len(a.jumps); i += 2 {
		a0, a1 := a.piece(i)
		for j := 0; j <= len(b.jumps); j += 2 {
			b0, b1 := b.piece(j)
			if dist(mid(a0, a1), mid(b0, b1)) < dist(a0, a1)/2+dist(b0, b1)/2+2*physics.BallR {
				return true
			}
		}
	}
	return false
}

// piece is a stretch of the frame the ball went in a straight line: the first one for i = 0, the
// next for i = 2...
func (b *ball) piece(i int) (from, to physics.Vec3) {
	from, to = b.before.ball.P, b.after.ball.P
	if i > 0 {
		from = b.jumps[i-1]
	}
	if i < len(b.jumps) {
		to = b.jumps[i]
	}
	return from, to
}

func mid(a, b physics.Vec3) physics.Vec3 {
	return physics.Vec3{X: (a.X + b.X) / 2, Y: (a.Y + b.Y) / 2, Z: (a.Z + b.Z) / 2}
}

func dist(a, b physics.Vec3) float64 {
	return math.Sqrt((a.X-b.X)*(a.X-b.X) + (a.Y-b.Y)*(a.Y-b.Y) + (a.Z-b.Z)*(a.Z-b.Z))
}

// state is the whole ball b on frame k: the last key of its track at or before k, played on alone
// up to k as play did (it met no ball in between). Reading frames in order replays each one once.
func (s *sim) state(b *ball, k int) golfer {
	t := &b.track
	if k >= t.end() {
		return t.last
	}
	k = max(k, t.from)
	i := len(t.keys) - 1
	for i > 0 && t.keys[i].k > k {
		i--
	}
	if !t.curOK || t.cur.k > k || t.cur.k < t.keys[i].k {
		t.cur, t.curOK = t.keys[i], true
	}
	for c := &t.cur; c.k < k; {
		c.k++
		s.world.Advance(&c.g.ball, c.k)
		s.drop = rules(s.world, &c.g, c.k, b.id, s.drop[:0])
	}
	s.world.Events = s.world.Events[:0]
	return t.cur.g
}

// invalid says whether a link of a track that replan keeps points to a ball that is gone, or
// whose track it played again from that frame or earlier.
func (s *sim) invalid(l link) bool {
	o := s.ball(l.with)
	return o == nil || o.replayed <= l.frame
}

// stale is the first frame from k on that a ball still on its track has an invalid link on, or
// never.
func (s *sim) stale(k int) int {
	first := never
	for _, b := range s.balls {
		for _, l := range b.track.links {
			if l.frame >= min(first, b.playFrom) {
				break
			}
			if l.frame >= k && s.invalid(l) {
				first = l.frame
			}
		}
	}
	return first
}

// play plays frame k for the balls of set, from b.before into b.after, with what happens to them
// (b.events) and the balls they met (b.met).
//
// Each ball moves on its own. Balls that meet on the way, going in a straight line across the
// frame, form a group played together (physics.World.Together): every collision between them is
// played, as many as there are. A group that then meets another ball takes it in, and is played
// again, until no group meets any other. So what a ball becomes depends on nothing but the balls
// of its group: the order of set does not matter, and a ball out of it comes out the same.
func (s *sim) play(k int, set []*ball) {
	w := s.world
	g := append(s.sorted[:0], set...)
	slices.SortFunc(g, func(a, b *ball) int { return cmp.Compare(a.id, b.id) })
	s.sorted = g
	for i, b := range g {
		b.after, b.events, b.met, b.group, b.jumps = b.before, b.events[:0], b.met[:0], i, b.jumps[:0]
		w.Events = w.Events[:0]
		w.Advance(&b.after.ball, k)
		b.events, b.jumps = record(w, b.events, b.jumps, k, b.id, &b.after.ball)
	}
	for !s.solo {
		merged := false
		for i, a := range g {
			for _, b := range g[i+1:] {
				if a.group == b.group || !solid(&a.before) || !solid(&b.before) || (a.after.ball.P == a.before.ball.P && b.after.ball.P == b.before.ball.P) {
					continue
				}
				if meets(a, b) {
					merged = true
					lo, hi := min(a.group, b.group), max(a.group, b.group)
					for _, m := range g {
						if m.group == hi {
							m.group = lo
						}
					}
				}
			}
		}
		if !merged {
			break
		}
		// every group of more than one ball is played again together, from the start of the frame
		for i, first := range g {
			if first.group != i {
				continue
			}
			phys := s.phys[:0]
			for _, b := range g[i:] {
				if b.group == i {
					phys = append(phys, &b.after.ball)
				}
			}
			s.phys = phys
			if len(phys) == 1 {
				continue
			}
			for _, b := range g[i:] {
				if b.group == i {
					b.after, b.events, b.jumps = b.before, b.events[:0], b.jumps[:0]
				}
			}
			w.Events = w.Events[:0]
			w.Together(phys, k)
			for _, b := range g[i:] {
				if b.group == i {
					b.events, b.jumps = record(w, b.events, b.jumps, k, b.id, &b.after.ball)
				}
			}
		}
	}
	for _, a := range g {
		for _, b := range g {
			if a != b && a.group == b.group {
				a.met = append(a.met, b.id)
			}
		}
		a.events = rules(w, &a.after, k, a.id, a.events)
	}
}

// record turns what the physics just reported of ball b into events, and its jumps.
func record(w *physics.World, ev []event, jumps []physics.Vec3, k int, id uint32, b *physics.Ball) ([]event, []physics.Vec3) {
	for _, e := range w.Events {
		if e.Ball != b {
			continue
		}
		value := float32(e.Speed)
		switch e.Kind {
		case physics.Teleported:
			jumps = append(jumps, e.From, e.To)
			value = float32(e.Ref)
		case physics.Kicked, physics.Entered:
			value = float32(e.Ref)
		}
		ev = append(ev, event{k, id, fromPhysics[e.Kind], value})
	}
	return ev, jumps
}

// rules is what the game does to a ball after the physics of frame k: strokes a zone gave, out of
// bounds, in a hazard or stuck (a penalty stroke, back to where it was shot from or the last
// checkpoint), in the cup, frozen, out of strokes.
func rules(w *physics.World, g *golfer, k int, id uint32, ev []event) []event {
	b, killY := &g.ball, w.Hole.KillY
	if b.Gifts != 0 { // power boxes: a power each, drawn at random, while a hand is free
		if g.powersOn && !g.finished {
			for i := range b.Gifts {
				if p := drawPower(k, id, i); g.give(p) {
					ev = append(ev, event{k, id, evPowerGot, float32(p)})
				}
			}
		}
		b.Gifts = 0
	}
	if b.Strokes != 0 {
		if !g.finished {
			g.strokes = max(0, g.strokes+b.Strokes)
			ev = append(ev, event{k, id, evStrokes, float32(g.strokes)})
		}
		b.Strokes = 0
	}
	if !g.finished && !b.Holed && (b.P.Y < killY || b.Stuck || b.Out) {
		b.Place(b.Respawn)
		w.Settle(b, k)
		g.strokes++
		ev = append(ev, event{k, id, evOut, float32(g.strokes)})
	}
	b.Out = false
	switch {
	case g.finished:
		// nobody waits for this ball: let it rattle in the cup a moment, never fall forever
		if (b.Holed && k-g.holedAt > holedFreeze) || b.P.Y < killY {
			b.Frozen = true
		}
	case b.Holed:
		g.finished, g.holedAt = true, k
		ev = append(ev, event{k, id, evHoled, float32(g.strokes)})
	case b.Rest && g.strokes >= g.limit:
		g.finished, g.strokes = true, g.limit
		ev = append(ev, event{k, id, evMaxed, float32(g.limit)})
	}
	return ev
}
