package physics

import "math"

// Everything that shapes how the ball feels is here.
const (
	Gravity      = 18.0
	MaxShotSpeed = 16.0 // speed of a shot at full power
	maxSpeed     = 24.0 // nothing goes faster: not a shot, not a modifier

	// Rolling: the ball loses fric*(rollDecel + rollDrag*speed) per second (fric: 1 on grass).
	rollDecel = 2.2  // u/s^2
	rollDrag  = 0.2  // 1/s
	airDrag   = 0.02 // 1/s, in flight

	// Bouncing: a surface whose normal is steeper than groundNY is ground (the ball keeps the bounce
	// of its material of its normal speed), the others are sides (its e). Soft hits do not bounce.
	groundNY        = 0.6
	groundBounceMin = 1.5  // u/s
	sideBounceMin   = 0.4  // u/s
	sideScrub       = 0.08 // share of a side hit taken off the speed along the surface
	ballBounce      = 0.85 // ball against ball

	// The cup behaves like a collider of its own.
	cupE, cupBounce, cupFriction = 0.25, 0.2, 1.0
	cupLipMaxUp                  = 1.2 // u/s: a fast ball clipping the far lip is not thrown into the sky

	// Rest: a ball stopped by friction where the slope cannot move it again is at rest at once.
	// Otherwise (wedged, rocking in a groove) it is after restTime under restSpeed.
	restSpeed     = 0.12
	restTime      = 0.25
	maxMovingTime = 30.0 // safety net: force a ball to rest after this long

	// Time: whole frames, each cut, for every ball, in as many steps as it needs to travel at most
	// maxTravel per step. Bounces, entering a zone and changes of support or of forces get a finer
	// treatment (see stepBall).
	FPS         = 60
	Tick        = 1.0 / FPS             // s of a frame
	Reach       = maxSpeed*Tick + BallR // how far a ball can get in a frame from where it started it, with room to spare
	maxTravel   = 0.1
	solverIters = 6
	maxCuts     = 4    // bounces whose moment is looked for within one step
	touchIters  = 12   // halvings to find that moment: maxTravel/4096 at worst
	touchDepth  = 1e-4 // a ball no further than this past a surface bounces where it is
	refineBy    = 4    // a step in which the ball changes support is played again in this many,
	refineDepth = 3    // and so on: down to 1/64 of a step
)

// The powers a shot may carry (the game arms them, see internal/game/powers.go). Each lasts until the
// ball comes to rest, or is put back.
const (
	PowerGhost  uint8 = 1 << iota // the ball goes through the other balls and the moving obstacles
	PowerSticky                   // it brakes hard and does not bounce off the ground
	PowerPull                     // the cup pulls it in from close by
)

const (
	stickyFric = 4   // the rolling resistance of a sticky ball, times that of the ground
	pullReach  = 3.5 // u: how far from the cup a pulled ball feels it
	pullAccel  = 6.0 // u/s²: how hard
)

// NoWake is the WakeAt of a ball at rest that no moving collider can reach.
const NoWake = math.MaxInt

// support is the ground a ball is on: its normal, friction and speed (a moving collider). Zero in the air.
type support struct {
	n    Vec3
	fric float64
	vel  Vec3
}

var flatGrass = support{n: Vec3{Y: 1}, fric: 1}

// Ball is everything about a ball: playing it on from a copy gives the same moves.
type Ball struct {
	P, V Vec3

	Rest   bool
	Solid  bool // has been shot on this hole: collides with other balls
	Holed  bool
	Frozen bool // set by the game once a holed ball has settled: no longer simulated
	Stuck  bool // moving for maxMovingTime with no still ground under it (wedged, carried): the game decides
	Out    bool // went into a hazard: the game decides

	Respawn Vec3   // where the game puts it back after a penalty: where it was shot from, or the last checkpoint
	Strokes int    // strokes zones gave its player since the game last looked (negative: fewer)
	Keys    uint8  // the gates it goes through, a bit per key
	Taken   uint64 // the zones that act once it went through, a bit per zone
	WakeAt  int    // at rest: the first frame a moving collider may move it, or NoWake; 0 while moving
	Power   uint8  // the powers at work on this shot (PowerGhost...): the ball loses them once at rest
	Gifts   uint8  // power boxes (zones "powerup") it went through since the game last looked

	on                    support
	restTimer, movingTime float64
	placed                bool // put down by NewBall or Place: Settle checks that the forces of the zones let it lie there
}

// NewBall is a ball at rest on pos, taken to lie on flat grass (its first step finds out otherwise).
// World.Settle must see it before it is played.
func NewBall(pos Vec3) Ball {
	return Ball{P: pos, Rest: true, on: flatGrass, Respawn: pos, placed: true}
}

// Shoot launches the ball along (dx, dz) with power in [0, 1].
func (b *Ball) Shoot(dx, dz, power float64) {
	l := math.Sqrt(dx*dx + dz*dz)
	if l == 0 {
		l = 1
	}
	s := max(0, min(1, power)) * MaxShotSpeed
	b.V = Vec3{dx / l * s, 0, dz / l * s}
	b.wake()
	b.Solid = true
}

// Place puts the ball at rest on pos. World.Settle must see it before it is played again.
func (b *Ball) Place(pos Vec3) {
	b.P, b.V, b.Rest, b.on, b.Stuck, b.Out, b.WakeAt, b.placed, b.Power = pos, Vec3{}, true, flatGrass, false, false, 0, true, 0
}

// Collides says whether other balls bounce off this one.
func (b *Ball) Collides() bool { return b.Solid && !b.Holed && !b.Frozen && b.Power&PowerGhost == 0 }

// Hop throws the ball up at vy (a jump power): it leaves the ground.
func (b *Ball) Hop(vy float64) {
	b.V.Y, b.on = vy, support{}
	b.wake()
}

// Boost speeds the ball up k times, within maxSpeed (a super shot).
func (b *Ball) Boost(k float64) { b.V, _ = capSpeed(b.V.scale(k)) }

func (b *Ball) wake() {
	b.Rest, b.restTimer, b.movingTime, b.WakeAt = false, 0, 0, 0
}

// World is a hole being played: the hole, and what happened in the last moves. Each ball moves on
// its own (Advance) and two balls meet through Collide, so what happens to a ball depends on
// nothing but itself, the hole, the frame and the balls it touches: a ball can be played again alone.
type World struct {
	Hole   *Hole
	Events []Event // of the moves since the caller last emptied it
}

type EventKind uint8

const (
	HitFloor EventKind = iota // a bounce, with the Speed of the hit
	HitWall
	HitPost
	HitCup
	HitBall
	Kicked     // a kicking collider (Ref, its index) sent the ball off
	Entered    // a zone (Ref, its index) acted on the ball
	Teleported // a teleporter (Ref, its zone index) moved the ball From To
)

// Event is something that happened to a ball, for whoever plays the sounds and the animations.
type Event struct {
	Ball     *Ball
	Kind     EventKind
	Speed    float64 // into the surface, u/s
	Ref      int
	From, To Vec3
}

func NewWorld(hole *Hole) *World { return &World{Hole: hole} }

// restitution is the share of its normal speed vn (negative when approaching) a ball keeps when
// it hits a surface of normal n: zero when the hit is too soft to bounce.
func restitution(n Vec3, vn, bounce, e float64) float64 {
	softest := sideBounceMin
	if n.Y > groundNY {
		e, softest = bounce, groundBounceMin
	}
	if -vn < softest {
		return 0
	}
	return e
}

// field is the forces on a ball where it is: gravity and the pushes of the zones it is in.
type field struct {
	g    float64
	push Vec3
}

func (w *World) field(b *Ball) field {
	f := w.Hole.calm
	if w.Hole.forces {
		f = w.Hole.applyForces(b, f)
	}
	if b.Power&PowerPull != 0 { // the cup pulls it, near it and about its height
		cup := &w.Hole.Cup
		if d, err := flat(Vec3{X: cup.X - b.P.X, Z: cup.Z - b.P.Z}); err == nil && math.Hypot(cup.X-b.P.X, cup.Z-b.P.Z) < pullReach && math.Abs(b.P.Y-cup.Y) < 1.5 {
			f.push = f.push.add(d.scale(pullAccel))
		}
	}
	return f
}

// holds says whether a ball stopped on this ground stays there.
func (f *field) holds(on support) bool {
	if f.push == (Vec3{}) {
		return f.g*math.Sqrt(max(0, 1-on.n.Y*on.n.Y)) <= on.fric*rollDecel
	}
	a := f.push.add(Vec3{Y: -f.g})
	return a.sub(on.n.scale(a.dot(on.n))).len() <= on.fric*rollDecel
}

// drift is where a ball is and how fast it goes after h, contacts aside: free flight, plus the
// rolling resistance of the ground it is on. stopped tells that the resistance brought it to a halt.
func (b *Ball) drift(h float64, f *field) (p, v Vec3, stopped bool) {
	g, push := f.g, f.push != (Vec3{})
	v = b.V
	p = b.P.add(Vec3{v.X * h, v.Y*h - g*h*h/2, v.Z * h}) // exact under constant forces
	if push {
		p = p.add(f.push.scale(h * h / 2))
	}
	if b.on.n == (Vec3{}) { // in the air
		v.Y -= g * h
		if push {
			v = v.add(f.push.scale(h))
		}
		return p, v.scale(math.Exp(-airDrag * h)), false
	}
	// Rolling resistance along the ground, in closed form over the step: ds/dt = -(c + k s),
	// between two halves of the forces (which matter on a slope). The ball was moved as if it had
	// kept its speed: take back the distance the resistance cost. On a moving ground the
	// resistance is to the speed relative to it.
	v.Y -= g * h / 2
	if push {
		v = v.add(f.push.scale(h / 2))
	}
	rel := v
	if b.on.vel != (Vec3{}) {
		rel = v.sub(b.on.vel)
	}
	t := rel.sub(b.on.n.scale(rel.dot(b.on.n)))
	s := t.len()
	stopped = s == 0
	if c, k := b.on.fric*rollDecel, b.on.fric*rollDrag; s > 0 && c > 0 {
		s1, rolling := (s+c/k)*math.Exp(-k*h)-c/k, h
		if s1 <= 0 { // stops within the step
			s1, rolling, stopped = 0, math.Log(1+k*s/c)/k, true
		}
		travel := (s - s1 - c*rolling) / k
		p = p.sub(t.scale((s*h - travel) / s))
		v = v.sub(t.scale((s - s1) / s))
	}
	v.Y -= g * h / 2
	if push {
		v = v.add(f.push.scale(h / 2))
	}
	return p, v, stopped
}

// touch returns how far into a step of h, starting at time t, a ball first hits a surface it
// bounces off, by halving the interval: that works for any shape, and finds the first of several.
func (w *World) touch(b *Ball, t, h float64, f *field) float64 {
	// "hitting" starts a hair inside the surface, so that a step cut there ends in it
	hitting := func(x float64) bool {
		p, v, _ := b.drift(x, f)
		c, n := w.overlap(p, &v, t+x, b)
		return n > 0 && c.depth > touchDepth/4
	}
	if hitting(0) {
		return 0
	}
	return bisect(h, hitting)
}

// bisect is how far into h a test that fails at 0 and holds at h starts to hold, found by halving
// touchIters times: maxTravel/4096 at worst.
func bisect(h float64, holds func(x float64) bool) float64 {
	lo, hi := 0.0, h
	for range touchIters {
		if mid := (lo + hi) / 2; holds(mid) {
			hi = mid
		} else {
			lo = mid
		}
	}
	return hi
}

// capSpeed brings v down to maxSpeed if it goes faster, and tells its speed then.
func capSpeed(v Vec3) (Vec3, float64) {
	sp := v.len()
	if sp > maxSpeed {
		return v.scale(maxSpeed / sp), maxSpeed
	}
	return v, sp
}

// stepBall advances one ball by h from time t. Rolling on a plane and flying are exact whatever
// h; the moment the ball changes support (lands, takes off, goes over an edge or onto another
// ground) or forces (in or out of a zone) is not: a step in which that happens is played again in
// smaller ones.
func (w *World) stepBall(b *Ball, t, h float64, depth int) {
	start, events := *b, len(w.Events)
	var in uint64
	if w.Hole.forces {
		in = w.Hole.inside(b.P)
	}
	w.bounceStep(b, t, h)
	if depth > 0 && (b.on.n != start.on.n || b.on.fric != start.on.fric || w.Hole.forces && w.Hole.inside(b.P) != in) {
		*b, w.Events = start, w.Events[:events]
		for i := 0; i < refineBy && !b.Rest; i++ {
			w.stepBall(b, t+float64(i)*(h/refineBy), h/refineBy, depth-1)
		}
	}
}

// bounceStep advances one ball by h from time t. Entering a zone that acts and bouncing cut the
// step at that moment, so that they happen where and when they should, with the speed the ball
// really has there.
// The forces are those where the ball is at the start of the step (stepBall makes sure they do not
// change within it), or after a zone acted on it.
func (w *World) bounceStep(b *Ball, t, h float64) {
	f := &w.Hole.calm
	if !w.Hole.forces && !w.Hole.enters && b.Power&PowerPull == 0 { // (a pulled ball has forces of its own)
		w.bounces(b, t, h, f)
		return
	}
	w.zoneStep(b, t, h, b.P, 0)
}

// zoneStep advances a ball by h from time t through every zone it enters on the way, one after
// the other: two that touch, a teleporter whose exit is in another zone. from is where its step
// started and done the zones that acted on it already, a bit each; it returns them.
func (w *World) zoneStep(b *Ball, t, h float64, from Vec3, done uint64) uint64 {
	here := w.field(b)
	var tried uint64 // the zones the drift was seen to enter: a bounce on the way may have kept the ball out
	for !b.Rest {
		// faster than the step was cut for (World.steps): a zone sped it up within the frame. The
		// rest in shorter steps, or it could go through a zone without being seen in it.
		if n := math.Ceil(b.V.len() * h / maxTravel); w.Hole.enters && n > 1 {
			for range int(n) {
				done = w.zoneStep(b, t, h/n, from, done)
				t += h / n
			}
			return done
		}
		z, at := w.entry(b, h, &here, from, done|tried)
		if z == nil {
			break
		}
		tried |= 1 << z.idx
		w.bounces(b, t, at, &here)
		if !b.Rest && z.contains(b.P) && z.open(b) {
			done |= 1 << z.idx
			w.enter(b, z)
			here = w.field(b)
		}
		t, h = t+at, h-at
	}
	w.bounces(b, t, h, &here)
	// a bounce may have taken the ball into a zone its drift did not cross: it acts now
	for _, i := range w.Hole.zgrid.at(b.P.X, b.P.Z) {
		if z := &w.Hole.Zones[i]; z.enterer != nil && done&(1<<i) == 0 && z.open(b) && z.contains(b.P) && !z.contains(from) {
			done |= 1 << i
			w.enter(b, z)
			if b.Rest && b.V != (Vec3{}) {
				b.wake() // it came to rest in it, and the zone sends it off
			}
		}
	}
	return done
}

func (w *World) bounces(b *Ball, t, h float64, f *field) {
	for cut := 0; cut < maxCuts && !b.Rest && h > 0; cut++ {
		at, hit := w.advance(b, t, h, f, true)
		if !hit {
			return
		}
		w.advance(b, t, at, f, false) // up to the impact: the ball bounces at the end of this one
		t, h = t+at, h-at
	}
	if !b.Rest && h > 0 {
		w.advance(b, t, h, f, false)
	}
}

// advance moves one ball by h from time t: forces f, then contacts. With cut set, a ball that ends
// up past a surface it bounces off is left untouched: advance reports the hit and how far into
// the step it happens. Otherwise bounces are resolved where the ball is.
func (w *World) advance(b *Ball, t, h float64, f *field, cut bool) (at float64, hit bool) {
	p, v, stopped := b.drift(h, f)
	end := t + h
	var on support
	events := len(w.Events)
	for it := 0; it < solverIters; it++ {
		c, count := w.overlap(p, nil, end, b)
		if count == 0 {
			break
		}
		s := w.Hole.surface(c.idx)
		n := c.n
		vs := w.Hole.surfaceVel(&c, p, end)
		vn := v.sub(vs).dot(n)
		isGround := n.Y > groundNY
		sticky := b.Power&PowerSticky != 0
		if isGround {
			fric := s.friction
			if sticky {
				fric *= stickyFric
			}
			on = support{n, fric, vs}
		}
		e := restitution(n, vn, s.bounce, s.e)
		if sticky && isGround {
			e = 0 // it lands and stays down
		}
		if vn < 0 && (e > 0 || s.kick > 0) && cut && c.depth > touchDepth {
			w.Events = w.Events[:events]
			return w.touch(b, t, h, f), true // too far past the surface for a bounce to be right here
		}
		p = p.add(n.scale(c.depth))
		if vn >= 0 {
			continue
		}
		jn := -(1 + e) * vn
		if s.kick > 0 {
			jn = s.kick - vn // it leaves at the speed of the kick, whatever it came in with
		}
		v = v.add(n.scale(jn))
		switch {
		case s.kick > 0:
			w.Events = append(w.Events, Event{Ball: b, Kind: Kicked, Speed: -vn, Ref: int(c.idx)})
		case e > 0:
			w.Events = append(w.Events, Event{Ball: b, Kind: s.kind, Speed: -vn})
		}
		if isGround && (e > 0 || s.kick > 0) {
			on = support{} // it takes off
		}
		if !isGround {
			// a side takes a little of the speed along it, so that grazing hits lose some energy
			r := v.sub(vs)
			tan := r.sub(n.scale(r.dot(n)))
			if ts := tan.len(); ts > 1e-6 {
				v = v.sub(tan.scale(min(ts, sideScrub*jn) / ts))
			}
		}
		if c.idx == cupIdx && v.Y > cupLipMaxUp {
			v.Y = cupLipMaxUp
		}
		if count == 1 && e == 0 && s.kick == 0 {
			break // lying on the only thing it touched
		}
	}

	// caught between a moving collider and a still one: squeezed out to the side that is free
	if out, ok := w.squeeze(p, end, b); ok {
		p, v, on = out, Vec3{}, support{}
	}
	v, sp := capSpeed(v)
	grounded, still := on.n != Vec3{}, on.vel == Vec3{}
	slow := grounded && sp < restSpeed
	b.movingTime += h
	if slow {
		b.restTimer += h
	} else {
		b.restTimer = 0
	}
	// stopped where the forces are too weak to beat the resistance at standstill: it stays there.
	// Never on a moving ground: it is carried.
	holds := stopped && slow && still && f.holds(on)
	if holds || (b.restTimer >= restTime && still) || (b.movingTime > maxMovingTime && grounded && still) {
		b.Rest, v, b.Power = true, Vec3{}, 0 // a power lasts a shot
	}
	// wedged or carried, where the rest test cannot see it: it would never stop
	b.Stuck = b.movingTime > maxMovingTime && (!grounded || !still)
	b.P, b.V, b.on = p, v, on

	cup := &w.Hole.Cup
	if dx, dz := p.X-cup.X, p.Z-cup.Z; p.Y < cup.Y-BallR*0.5 && p.Y > cup.Y-CupDepth-BallR && dx*dx+dz*dz < cup.R*cup.R {
		b.Holed = true
	}
	return 0, false
}

// Collide pushes two balls apart if they overlap and makes them bounce off each other if they are
// coming closer. The bounce is a hit of a. Two balls on the
// very same spot (shot the same way on the same frame, put back on the same spot) go apart along X.
func (w *World) Collide(a, b *Ball) {
	d := b.P.sub(a.P)
	dl := d.len()
	if dl >= BallR*2 {
		return
	}
	n := Vec3{X: 1}
	if dl >= 1e-9 {
		n = Vec3{d.X / dl, d.Y / dl, d.Z / dl}
	}
	apart := n.scale((BallR*2 - dl) / 2)
	a.P, b.P = a.P.sub(apart), b.P.add(apart)
	if vn := b.V.sub(a.V).dot(n); vn < 0 {
		if -vn >= sideBounceMin {
			w.Events = append(w.Events, Event{Ball: a, Kind: HitBall, Speed: -vn})
		}
		kick := n.scale(-(1 + ballBounce) * vn / 2)
		a.V, b.V = a.V.sub(kick), b.V.add(kick)
		for _, x := range [2]*Ball{a, b} {
			if x.Rest && x.V.len() > restSpeed*1.5 {
				x.wake()
			}
		}
	}
}

// Meet returns when, as a share of a frame, two balls going in a straight line from a0 to a1 and
// from b0 to b1 first touch, if they do: 0 when they overlap from the start.
func Meet(a0, a1, b0, b1 Vec3) (t float64, ok bool) {
	const touch = 2*BallR - 1e-7 // Collide leaves them 2*BallR apart: that is not touching any more
	d, v := b0.sub(a0), b1.sub(b0).sub(a1.sub(a0))
	c := d.dot(d) - touch*touch
	if c < 0 {
		return 0, true
	}
	a, b := v.dot(v), d.dot(v)
	if b >= 0 || a == 0 {
		return 0, false // not coming closer
	}
	disc := b*b - a*c
	if disc < 0 {
		return 0, false
	}
	t = (-b - math.Sqrt(disc)) / a
	return t, t <= 1
}

// steps is how many steps a frame takes for a ball going at speed v: enough for none to travel
// more than maxTravel, with all the hole can add to it.
func (w *World) steps(v float64) int {
	n := int(math.Ceil((v + w.Hole.accel*Tick + w.Hole.speed) * Tick / maxTravel))
	return max(1, min(n, 16))
}

// due says whether a ball at rest has to be played on frame k: a moving collider may reach it.
func (w *World) due(b *Ball, k int) bool {
	if b.WakeAt == 0 {
		w.Settle(b, k-1)
	}
	return k >= b.WakeAt
}

// Settle tells a ball at rest at the end of frame k when a moving collider may move it. A ball
// put down where the forces of a zone cannot hold it (the tee, after a penalty) starts moving; one
// that came to rest by itself stays, held by what it lies against (a wind pins it to a wall).
func (w *World) Settle(b *Ball, k int) {
	if !b.Rest || b.Frozen || b.WakeAt != 0 {
		return
	}
	placed := b.placed
	b.placed = false
	if f := w.field(b); placed && w.Hole.forces && !f.holds(b.on) {
		b.wake()
		return
	}
	b.WakeAt = w.wakeAt(b.P, k+1)
}

// Together plays frame k for balls that meet on the way: all of them in the steps the fastest
// needs, and after each step every two that collide and overlap bounce off each other (Collide,
// in the order of balls). What happens to them is added to w.Events.
func (w *World) Together(balls []*Ball, k int) {
	var nudged uint64 // at rest, but a moving collider may reach them: played the whole frame
	fastest := 0.0
	for i, b := range balls {
		if b.Rest && !b.Frozen && w.due(b, k) {
			b.wake()
			nudged |= 1 << i
		}
		if !b.Rest && !b.Frozen {
			fastest = max(fastest, b.V.len())
		}
	}
	steps := w.steps(fastest)
	h, t := Tick/float64(steps), float64(k-1)*Tick
	for ; steps > 0; steps-- {
		for i, b := range balls {
			if b.Rest && nudged&(1<<i) != 0 {
				b.Rest = false
			}
			if !b.Rest && !b.Frozen {
				w.stepBall(b, t, h, refineDepth)
			}
		}
		for i, a := range balls {
			if !a.Collides() {
				continue
			}
			for _, b := range balls[i+1:] {
				if b.Collides() {
					w.Collide(a, b)
				}
			}
		}
		t += h
	}
	for _, b := range balls {
		w.Settle(b, k)
	}
}

// Advance plays frame k for one ball on its own: in as many steps as its speed needs for none to
// travel more than maxTravel. What happens to it is added to w.Events. A frozen ball does not
// move, nor does a ball at rest that no moving collider can reach. Anything that sets a ball in
// motion has to keep within maxSpeed: Reach counts on it.
func (w *World) Advance(b *Ball, k int) {
	if b.Frozen {
		return
	}
	nudged := false
	if b.Rest {
		if !w.due(b, k) {
			return
		}
		b.wake()
		nudged = true
	}
	steps := w.steps(b.V.len())
	h, t := Tick/float64(steps), float64(k-1)*Tick
	for ; steps > 0; steps-- {
		if b.Rest {
			if !nudged {
				break
			}
			b.Rest = false
		}
		w.stepBall(b, t, h, refineDepth)
		t += h
	}
	w.Settle(b, k)
}
