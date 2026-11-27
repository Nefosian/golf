package physics

import "math"

// contact is an overlap between the ball and one surface.
type contact struct {
	depth float64
	n     Vec3
	idx   int32 // collider index, or cupIdx
}

const cupIdx = -1

func sign(v float64) float64 {
	if v < 0 {
		return -1
	}
	return 1
}

func clamp(v, limit float64) float64 { return max(-limit, min(limit, v)) }

// boxContact is the overlap of a ball centered on p with a box centered on c, rotated by m.
func boxContact(col *Collider, c *Vec3, m *mat3, p Vec3, cup *Cup) (ct contact, ok bool) {
	h := col.H
	r := p.sub(*c)
	if reach := col.bound + BallR; r.dot(r) > reach*reach {
		return ct, false
	}
	if col.HasCup {
		if dx, dz := p.X-cup.X, p.Z-cup.Z; dx*dx+dz*dz < cup.R*cup.R {
			return ct, false // over the hole: the rim takes over
		}
	}
	// l: the ball in the frame of the box, q: the nearest point of the box
	l := Vec3{m[0]*r.X + m[3]*r.Y + m[6]*r.Z, m[1]*r.X + m[4]*r.Y + m[7]*r.Z, m[2]*r.X + m[5]*r.Y + m[8]*r.Z}
	q := Vec3{clamp(l.X, h.X), clamp(l.Y, h.Y), clamp(l.Z, h.Z)}
	var n Vec3
	if q != l {
		d := l.sub(q)
		d2 := d.dot(d)
		if d2 >= BallR*BallR {
			return ct, false
		}
		dl := math.Sqrt(d2)
		n, ct.depth = Vec3{d.X / dl, d.Y / dl, d.Z / dl}, BallR-dl
	} else {
		// center inside the box: out through the nearest face
		px, py, pz := h.X-math.Abs(l.X), h.Y-math.Abs(l.Y), h.Z-math.Abs(l.Z)
		switch {
		case py <= px && py <= pz:
			n.Y, ct.depth = sign(l.Y), BallR+py
		case px <= pz:
			n.X, ct.depth = sign(l.X), BallR+px
		default:
			n.Z, ct.depth = sign(l.Z), BallR+pz
		}
	}
	ct.n = Vec3{m[0]*n.X + m[1]*n.Y + m[2]*n.Z, m[3]*n.X + m[4]*n.Y + m[5]*n.Z, m[6]*n.X + m[7]*n.Y + m[8]*n.Z}
	return ct, true
}

// cylContact is the overlap of a ball centered on p with a vertical cylinder centered on c.
func cylContact(col *Collider, c *Vec3, p Vec3) (ct contact, ok bool) {
	dx, dz := p.X-c.X, p.Z-c.Z
	l2 := dx*dx + dz*dz
	if reach := col.R + BallR; l2 > reach*reach {
		return ct, false
	}
	top, bot := c.Y+col.HH, c.Y-col.HH
	if p.Y > top+BallR || p.Y < bot-BallR {
		return ct, false
	}
	l := math.Sqrt(l2)
	ux, uz := 1.0, 0.0
	if l > 1e-9 {
		ux, uz = dx/l, dz/l
	}
	if l > col.R || p.Y > top || p.Y < bot {
		q := Vec3{p.X, max(bot, min(top, p.Y)), p.Z} // nearest point of the cylinder
		if l > col.R {
			q.X, q.Z = c.X+ux*col.R, c.Z+uz*col.R
		}
		e := p.sub(q)
		dl := e.len()
		if dl >= BallR || dl < 1e-9 {
			return ct, false
		}
		return contact{depth: BallR - dl, n: Vec3{e.X / dl, e.Y / dl, e.Z / dl}}, true
	}
	// center inside the cylinder: out through the top or the side, whichever is nearer
	if side, up := col.R-l, top-p.Y; up < side {
		return contact{depth: BallR + up, n: Vec3{0, 1, 0}}, true
	} else {
		return contact{depth: BallR + side, n: Vec3{ux, 0, uz}}, true
	}
}

// cupContact is the deepest of the rim (a circle at floor height), the inner wall and the bottom.
func cupContact(cup *Cup, p Vec3) (best contact, ok bool) {
	dx, dz := p.X-cup.X, p.Z-cup.Z
	l2 := dx*dx + dz*dz
	if reach := cup.R + BallR; l2 > reach*reach {
		return best, false
	}
	l := math.Sqrt(l2)
	ux, uz := 1.0, 0.0
	if l > 1e-9 {
		ux, uz = dx/l, dz/l
	}
	e := p.sub(Vec3{cup.X + ux*cup.R, cup.Y, cup.Z + uz*cup.R})
	if dl := e.len(); dl < BallR && dl > 1e-9 {
		best, ok = contact{depth: BallR - dl, n: Vec3{e.X / dl, e.Y / dl, e.Z / dl}}, true
	}
	if l < cup.R && p.Y < cup.Y && p.Y > cup.Y-CupDepth-BallR { // in the cup, not under it
		if wall := l - (cup.R - BallR); wall > 0 && (!ok || wall > best.depth) {
			best, ok = contact{depth: wall, n: Vec3{-ux, 0, -uz}}, true
		}
		if bottom := cup.Y - CupDepth - (p.Y - BallR); bottom > 0 && (!ok || bottom > best.depth) {
			best, ok = contact{depth: bottom, n: Vec3{0, 1, 0}}, true
		}
	}
	best.idx = cupIdx
	return best, ok
}

// contactAt is the overlap of a ball centered on p with a collider, where it is at time t.
func (col *Collider) contactAt(p Vec3, t float64, cup *Cup) (contact, bool) {
	c, m := col.C, &col.m
	if col.Motion != nil {
		var mt mat3
		c, mt = col.posed(t)
		m = &mt
	}
	if col.Shape == Box {
		return boxContact(col, &c, m, p, cup)
	}
	return cylContact(col, &c, p)
}

// surface is how a collider (or the cup) treats the ball.
type surface struct {
	friction, bounce, e, kick float64
	kind                      EventKind // of a bounce on it
}

var cupSurface = surface{cupFriction, cupBounce, cupE, 0, HitCup}

func (h *Hole) surface(idx int32) *surface {
	if idx == cupIdx {
		return &cupSurface
	}
	return &h.Colliders[idx].surf
}

// surfaceVel is the speed at time t of the surface a ball centered on p touches: zero but on a
// moving collider.
func (h *Hole) surfaceVel(c *contact, p Vec3, t float64) Vec3 {
	if c.idx == cupIdx || h.Colliders[c.idx].Motion == nil {
		return Vec3{}
	}
	return h.Colliders[c.idx].velocity(p.sub(c.n.scale(BallR-c.depth)), t)
}

// bounces says whether a ball centered on p and moving at v bounces off what it touches in ct.
func (h *Hole) bounces(ct *contact, p, v Vec3, t float64) bool {
	s := h.surface(ct.idx)
	vn := v.sub(h.surfaceVel(ct, p, t)).dot(ct.n)
	return restitution(ct.n, vn, s.bounce, s.e) > 0 || (s.kick > 0 && vn < 0)
}

// squeezeDirs are where a squeezed ball may go: all around, at its height.
var squeezeDirs = func() []Vec3 {
	var d []Vec3
	for i := range 16 {
		a := float64(i) * math.Pi / 8
		d = append(d, Vec3{X: math.Cos(a), Z: math.Sin(a)})
	}
	return d
}()

// squeeze says where a ball centered on p at time t goes when a moving collider pushes it into a
// still side (a wall, a post) or the floor: the contacts can then not all be solved, and the ball
// stays inside the side, sinks into the floor, or stays inside the moving collider. It goes to the nearest place at its height, along the side, where it overlaps nothing
// and that it gets to without going through anything; up only when there is none (up, it could
// fall on the other side of a wall). Without this the collider would push it through.
func (w *World) squeeze(p Vec3, t float64, b *Ball) (Vec3, bool) {
	if b.Power&PowerGhost != 0 {
		return p, false // the moving colliders go through it
	}
	h := w.Hole
	var touching []Vec3                                // the normals of the still surfaces it overlaps
	pushed, side, sunk, into := false, false, 0.0, 0.0 // into: how deep it is in a moving collider
	for _, i := range h.grid.at(p.X, p.Z) {
		col := &h.Colliders[i]
		if col.Key != 0 && b.Keys&(1<<(col.Key-1)) != 0 {
			continue
		}
		if col.Motion != nil {
			pushed = pushed || col.near(p, t, 0.01)
			if ct, ok := col.contactAt(p, t, &h.Cup); ok {
				into = max(into, ct.depth)
			}
		} else if ct, ok := col.contactAt(p, t, &h.Cup); ok && ct.depth > 1e-4 {
			touching = append(touching, ct.n)
			if ct.n.Y > groundNY {
				sunk = max(sunk, ct.depth) // into the ground: back on it
			}
			// a side it got into, or anything it sank into: a ball the solver lets lie on the
			// ground is never 1 cm in it
			side = side || ct.depth >= 1e-3 && ct.n.Y <= groundNY || ct.depth >= 0.01
		}
	}
	// caught: it stayed in a still side, or in the moving collider (pushed against the floor, say:
	// a ball the contacts were solved for is never 1 cm in anything)
	if !pushed || !side && into < 0.01 {
		return p, false
	}
	free := func(q Vec3) bool { c, n := w.overlap(q, nil, t, b); return n == 0 || c.depth < 1e-3 }
	// no part of the way there inside a still collider
	clearWay := func(q Vec3) bool {
		for f := 0.1; f < 1; f += 0.1 {
			if d, _ := h.DepthAt(p.add(q.sub(p).scale(f)), b.Keys, -1); d > BallR {
				return false
			}
		}
		return true
	}
	away := func(d Vec3) bool { // from every still surface it touches
		for _, n := range touching {
			if d.dot(n) < -1e-9 {
				return false
			}
		}
		return true
	}
	lift := Vec3{Y: sunk}
	for s := 0.01; s <= 1.5; s += 0.01 {
		for _, d := range squeezeDirs {
			if q := p.add(d.scale(s)).add(lift); away(d) && free(q) && clearWay(q) {
				return q, true
			}
		}
	}
	for s := 0.01; s <= 1.5; s += 0.01 {
		if q := p.add(Vec3{Y: s}); free(q) && clearWay(q) {
			return q, true
		}
	}
	return p, false
}

// overlap returns the deepest overlap at time t of ball b centered on p and how many surfaces it
// overlaps. On equal depth the collider that comes first in the hole wins. With v set, only the
// surfaces that a ball moving at v hits hard enough to bounce off are looked at.
func (w *World) overlap(p Vec3, v *Vec3, t float64, b *Ball) (best contact, count int) {
	h := w.Hole
	keep := func(ct *contact, ok bool) {
		if ok && v != nil {
			ok = h.bounces(ct, p, *v, t)
		}
		if ok {
			if count++; count == 1 || ct.depth > best.depth {
				best = *ct
			}
		}
	}
	for _, i := range h.grid.at(p.X, p.Z) {
		col := &h.Colliders[i]
		if col.Key != 0 && b.Keys&(1<<(col.Key-1)) != 0 {
			continue // a gate this ball has the key of
		}
		if col.Motion != nil && b.Power&PowerGhost != 0 {
			continue // a ghost goes through what moves
		}
		var ct contact
		var ok bool
		switch {
		case col.Motion != nil:
			ct, ok = col.contactAt(p, t, &h.Cup)
		case col.Shape == Box:
			ct, ok = boxContact(col, &col.C, &col.m, p, &h.Cup)
		default:
			ct, ok = cylContact(col, &col.C, p)
		}
		ct.idx = i
		keep(&ct, ok)
	}
	ct, ok := cupContact(&h.Cup, p)
	keep(&ct, ok)
	return best, count
}
