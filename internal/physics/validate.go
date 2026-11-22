package physics

import (
	"fmt"
	"math"
)

// The rules a hole must follow beyond being well formed: each refuses something the engine would
// play wrong or that could not be played, and says why from how the engine works. Build applies
// them; whether the cup can be reached at all is checked by simulation (game.Verify, tools/verify).

const (
	// maxCoord bounds every coordinate and every extent (|x|, |y|, |z|): the broadphase keeps cells
	// of 2 units up to 2^16 of them, a span of 512, and float32 positions on the wire stay well
	// under touchDepth there.
	maxCoord = 255
	// zoneTopMargin: a zone the ball rolls through reaches higher than its center on the floor by
	// what a ball can sink in a frame under the strongest gravity (a hole of 3·Gravity): otherwise
	// its center may never be seen inside.
	zoneTopMargin = 3 * Gravity * Tick * Tick / 2
	// minGravity: a ball thrown up at maxSpeed comes down within maxMovingTime.
	minGravity = 2 * maxSpeed / maxMovingTime
)

// passive are the zones that only mark the ball (a bonus, keys, respawn, a penalty): two
// of them may overlap, they act the same in either order. Any zone that sets the ball's speed or
// place may not overlap another one that acts on entering: the second would not act, or act on a
// ball the first has changed, depending on which comes first in the map.
var passive = map[string]bool{"hazard": true, "checkpoint": true, "strokes": true, "key": true}

// span is what a collider or a zone may occupy: seen from above a circle, or a rectangle along the
// unit axis (ux, uz) and its normal (an upright box, exactly; any other one, its bounding box), and
// a height range. A moving collider: the box it slides in, or the sphere it never leaves when it turns.
type span struct {
	circle         bool
	cx, cz, ex, ez float64 // center, half-sizes along the axis and its normal (ex: the radius of a circle)
	ux, uz         float64
	y0, y1         float64
}

func boxSpan(c Vec3, m *mat3, h Vec3) span {
	if math.Abs(m[4]-1) < 1e-9 { // upright: turned around Y only
		return span{cx: c.X, cz: c.Z, ex: h.X, ez: h.Z, ux: m[0], uz: m[6], y0: c.Y - h.Y, y1: c.Y + h.Y}
	}
	ex, ez := extent(Box, m, h, 0, 0)
	ey := math.Abs(m[3])*h.X + math.Abs(m[4])*h.Y + math.Abs(m[5])*h.Z
	return span{cx: c.X, cz: c.Z, ex: ex, ez: ez, ux: 1, y0: c.Y - ey, y1: c.Y + ey}
}

// bounds is the bounding box of a span, as a span.
func (s span) bounds() span {
	if s.circle {
		return s
	}
	ex := math.Abs(s.ux)*s.ex + math.Abs(s.uz)*s.ez
	ez := math.Abs(s.uz)*s.ex + math.Abs(s.ux)*s.ez
	return span{cx: s.cx, cz: s.cz, ex: ex, ez: ez, ux: 1, y0: s.y0, y1: s.y1}
}

func (c *Collider) span() span {
	switch {
	case c.Motion != nil && c.Motion.Axis == (Vec3{}):
		// it slides from where it is to Move and back: the bounding box of both ends
		a, b := c.still().bounds(), c.still().bounds()
		b.cx, b.cz, b.y0, b.y1 = b.cx+c.Motion.Move.X, b.cz+c.Motion.Move.Z, b.y0+c.Motion.Move.Y, b.y1+c.Motion.Move.Y
		x0, x1 := min(a.cx-a.ex, b.cx-b.ex), max(a.cx+a.ex, b.cx+b.ex)
		z0, z1 := min(a.cz-a.ez, b.cz-b.ez), max(a.cz+a.ez, b.cz+b.ez)
		return span{circle: a.circle && a.cx == b.cx && a.cz == b.cz, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, ex: (x1 - x0) / 2, ez: (z1 - z0) / 2, ux: 1,
			y0: min(a.y0, b.y0), y1: max(a.y1, b.y1)}
	case c.Motion != nil:
		s, r := c.sweep()
		return span{circle: true, cx: s.X, cz: s.Z, ex: r, ez: r, y0: s.Y - r, y1: s.Y + r}
	}
	return c.still()
}

// still is the span of a collider where it stands.
func (c *Collider) still() span {
	if c.Shape == Cyl {
		return span{circle: true, cx: c.C.X, cz: c.C.Z, ex: c.R, ez: c.R, y0: c.C.Y - c.HH, y1: c.C.Y + c.HH}
	}
	return boxSpan(c.C, &c.m, c.H)
}

func (z *Zone) span() span {
	if z.Shape == Cyl {
		return span{circle: true, cx: z.C.X, cz: z.C.Z, ex: z.R, ez: z.R, y0: z.C.Y - z.HH, y1: z.C.Y + z.HH}
	}
	return boxSpan(z.C, &z.m, z.H)
}

// gapXZ is how far apart two spans are seen from above, negative when they overlap; between two
// rectangles, a lower bound of it (their separation along the best of their four axes).
func gapXZ(a, b span) float64 {
	switch {
	case a.circle && b.circle:
		return math.Hypot(a.cx-b.cx, a.cz-b.cz) - a.ex - b.ex
	case !a.circle && !b.circle:
		gap := math.Inf(-1)
		for _, ax := range [4][2]float64{{a.ux, a.uz}, {-a.uz, a.ux}, {b.ux, b.uz}, {-b.uz, b.ux}} {
			reach := func(s span) float64 {
				return s.ex*math.Abs(ax[0]*s.ux+ax[1]*s.uz) + s.ez*math.Abs(-ax[0]*s.uz+ax[1]*s.ux)
			}
			d := math.Abs(ax[0]*(a.cx-b.cx)+ax[1]*(a.cz-b.cz)) - reach(a) - reach(b)
			gap = max(gap, d)
		}
		return gap
	case a.circle:
		a, b = b, a
	}
	// a rectangle, b a circle: the circle's center in the rectangle's frame
	px, pz := b.cx-a.cx, b.cz-a.cz
	lx, lz := px*a.ux+pz*a.uz, -px*a.uz+pz*a.ux
	dx, dz := math.Abs(lx)-a.ex, math.Abs(lz)-a.ez
	if dx > 0 || dz > 0 {
		return math.Hypot(max(dx, 0), max(dz, 0)) - b.ex
	}
	return max(dx, dz) - b.ex
}

// overlap says whether two spans share some volume (touching is not overlapping).
func overlap(a, b span) bool { return gapXZ(a, b) < 0 && a.y0 < b.y1 && b.y0 < a.y1 }

// inBounds checks maxCoord, before anything is sized after the hole.
func (h *Hole) inBounds() error {
	far := func(s span) bool {
		s = s.bounds()
		return math.Abs(s.cx)+s.ex > maxCoord || math.Abs(s.cz)+s.ez > maxCoord || math.Abs(s.y0) > maxCoord || math.Abs(s.y1) > maxCoord
	}
	point := func(p Vec3) bool { return far(span{cx: p.X, cz: p.Z, y0: p.Y, y1: p.Y}) }
	for i := range h.Colliders {
		if far(h.Colliders[i].span()) {
			return fmt.Errorf("collider %d goes further than %d from the origin", i, maxCoord)
		}
	}
	for i := range h.Zones {
		if far(h.Zones[i].span()) {
			return fmt.Errorf("zone %d goes further than %d from the origin", i, maxCoord)
		}
	}
	if point(h.Tee) || point(Vec3{h.Cup.X, h.Cup.Y, h.Cup.Z}) {
		return fmt.Errorf("the tee or the cup is further than %d from the origin", maxCoord)
	}
	return nil
}

// validate applies the rules to a hole otherwise built.
func (h *Hole) validate() error {
	if h.Cup.R < CupR {
		return fmt.Errorf("the cup is %g wide at least (r): a smaller one only takes the slowest balls", CupR)
	}
	if h.g < minGravity {
		return fmt.Errorf("gravity is %.1f at least: a ball thrown up must come down before the %g s safety net", minGravity, maxMovingTime)
	}
	if h.Par > h.StrokeLimit() {
		return fmt.Errorf("par %d is more than the %d strokes a player has", h.Par, h.StrokeLimit())
	}
	cupFloor := -1
	gates, keys := map[uint8]bool{}, map[uint8]bool{}
	for i := range h.Colliders {
		c := &h.Colliders[i]
		if c.HasCup {
			cupFloor = i
		}
		if c.Shape == Cyl && c.Rot != (Vec3{}) {
			return fmt.Errorf("collider %d: a cylinder stands upright (no rot)", i)
		}
		if c.Key != 0 {
			gates[c.Key] = true
		}
		if m := c.Motion; m != nil {
			switch {
			case m.Phase < 0 || m.Phase >= 1:
				return fmt.Errorf("collider %d: phase is in [0, 1), a share of the period", i)
			case m.Period > maxMovingTime:
				return fmt.Errorf("collider %d: period is %g s at most", i, maxMovingTime)
			case m.speed == 0:
				return fmt.Errorf("collider %d: a motion moves (move or axis)", i)
			}
		}
	}
	if h.Colliders[cupFloor].Key != 0 {
		return fmt.Errorf("collider %d: the floor of the cup is not a gate", cupFloor)
	}

	// The cup: its wall and its bottom catch a ball anywhere in its column, so nothing lies under
	// it, and nothing but its floor takes room in it from its bottom to a ball resting on its rim.
	cup := &h.Cup
	under := h.Colliders[cupFloor].C.Y - h.Colliders[cupFloor].H.Y // the bottom of the cup's floor
	shaft := span{circle: true, cx: cup.X, cz: cup.Z, ex: cup.R, ez: cup.R, y0: cup.Y - CupDepth, y1: cup.Y + 2*BallR}
	for i := range h.Colliders {
		if i == cupFloor {
			continue
		}
		s := h.Colliders[i].span()
		// a ball under the cup is caught by it, but there is no room for one right under its floor
		if s.y1 < cup.Y-1e-6 && s.y1 <= under-2*BallR && gapXZ(s, shaft) < BallR {
			return fmt.Errorf("collider %d lies under the cup", i)
		}
		if overlap(s, shaft) {
			return fmt.Errorf("collider %d takes room in the cup", i)
		}
	}

	for i := range h.Zones {
		z := &h.Zones[i]
		s := z.span()
		if z.Shape == Cyl && z.Rot != (Vec3{}) {
			return fmt.Errorf("zone %d: a cylinder stands upright (no rot)", i)
		}
		if z.Once && !passive[z.Type] {
			// one that moves the ball, once, would be gone for a ball put back after a penalty
			return fmt.Errorf("zone %d %s: once is for zones that only mark the ball (%s)", i, z.Type, "hazard, checkpoint, strokes, key")
		}
		if z.enterer != nil && overlap(s, shaft) {
			return fmt.Errorf("zone %d %s: a zone that acts on entering does not reach into the cup", i, z.Type)
		}
		// a ball rolls on the floor under it with its center at BallR: in, by what it may sink in a
		// frame. (The client draws a zone's pattern on its bottom, on the ground.)
		f, y, _ := h.floorUnder(z.C.X, z.C.Z, s.y1)
		if above, _, _ := h.floorUnder(z.C.X, z.C.Z, math.Inf(1)); f < 0 && above >= 0 {
			return fmt.Errorf("zone %d %s lies under the floor, with nothing under it: no ball gets there", i, z.Type)
		}
		if f >= 0 && (s.y1 < y+BallR+zoneTopMargin || s.y0 > y+BallR-zoneTopMargin) {
			return fmt.Errorf("zone %d %s: it starts on the floor under it and reaches %.3f above it at least, or a rolling ball is never in it", i, z.Type, BallR+zoneTopMargin)
		}
		for j := range i {
			o := &h.Zones[j]
			if z.enterer == nil || o.enterer == nil || !overlap(s, o.span()) {
				continue
			}
			if !passive[z.Type] || !passive[o.Type] || z.Type == o.Type && z.Type == "checkpoint" {
				return fmt.Errorf("zones %d %s and %d %s overlap: their effects would depend on their order", j, o.Type, i, z.Type)
			}
		}
		switch e := z.enterer.(type) {
		case *key:
			keys[e.Key] = true
		case *strokes:
			if !z.Once {
				return fmt.Errorf("zone %d strokes: a bonus is once, or it can be taken again and again", i)
			}
		case *checkpoint:
			if err := h.restsOn(e.At, i); err != nil {
				return fmt.Errorf("zone %d checkpoint: a ball put back on at %v", i, err)
			}
		case *teleport:
			if err := h.landsOn(e.To); err != nil {
				return fmt.Errorf("zone %d teleport: a ball coming out at to %v", i, err)
			}
		}
		if m, ok := z.fielder.(*magnet); ok && m.Accel > 0 {
			fric := 1.0
			if f, _, _ := h.floorUnder(m.At.X, m.At.Z, z.span().y1); f >= 0 {
				fric = h.Colliders[f].surf.friction
			}
			if m.Accel > rollDecel*fric && math.Hypot(m.At.X-cup.X, m.At.Z-cup.Z) >= cup.R {
				return fmt.Errorf("zone %d magnet: one stronger than the rolling resistance there (%.2f) pulls into the cup, or a ball circles it for ever", i, rollDecel*fric)
			}
		}
	}
	for k := range gates {
		if !keys[k] {
			return fmt.Errorf("no zone gives key %d, which a gate needs", k)
		}
	}
	for k := range keys {
		if !gates[k] {
			return fmt.Errorf("no gate takes key %d, which a zone gives", k)
		}
	}
	if err := h.restsOn(h.Tee, -1); err != nil {
		return fmt.Errorf("a ball on the tee %v", err)
	}
	return nil
}

// restsOn says why a ball put down on p (the tee, a checkpoint) would not stay there until shot,
// out of the way: own is the zone that put it there, or -1.
func (h *Hole) restsOn(p Vec3, own int) error {
	f, y, n := h.floorUnder(p.X, p.Z, p.Y-BallR)
	switch {
	case f < 0:
		return fmt.Errorf("has no floor under it")
	case math.Abs(p.Y-(y+BallR)) > 1e-6:
		return fmt.Errorf("does not lie on the floor under it")
	case n.Y < 1-1e-9:
		return fmt.Errorf("lies on a slope")
	case h.Colliders[f].Key != 0:
		return fmt.Errorf("lies on a gate")
	case math.Hypot(p.X-h.Cup.X, p.Z-h.Cup.Z) < h.Cup.R+BallR:
		return fmt.Errorf("lies on the cup")
	}
	b := NewBall(p)
	b.on = support{n: n, fric: h.Colliders[f].surf.friction}
	if fd := NewWorld(h).field(&b); fd.g <= 0 || !fd.holds(b.on) {
		return fmt.Errorf("is moved by the forces of a zone")
	}
	if NewWorld(h).wakeAt(p, 1) != NoWake {
		return fmt.Errorf("may be moved by a moving collider")
	}
	if err := h.clear(p); err != nil {
		return err
	}
	for i := range h.Zones {
		if z := &h.Zones[i]; i != own && z.enterer != nil && z.contains(p) {
			return fmt.Errorf("is in zone %d %s, which never acts on it", i, z.Type)
		}
	}
	return nil
}

// landsOn says why a ball appearing on p (a teleporter's exit) would be in trouble.
func (h *Hole) landsOn(p Vec3) error {
	if err := h.clear(p); err != nil {
		return err
	}
	if f, _, _ := h.floorUnder(p.X, p.Z, p.Y-BallR); f < 0 {
		return fmt.Errorf("has no floor under it")
	}
	return nil
}

// clear says whether a ball on p is inside a static collider.
func (h *Hole) clear(p Vec3) error {
	for i := range h.Colliders {
		if c := &h.Colliders[i]; c.Motion == nil {
			if ct, ok := c.contactAt(p, 0, &h.Cup); ok && ct.depth > 1e-6 {
				return fmt.Errorf("is inside collider %d", i)
			}
		}
	}
	return nil
}
