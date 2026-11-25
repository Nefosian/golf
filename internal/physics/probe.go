package physics

// What the map verifier (game.Verify) reads of a ball, to tell when the engine plays it wrong. Read
// only: nothing here changes how a ball moves.

// MaxSpeed is the fastest a ball ever goes.
const MaxSpeed = maxSpeed

// ZonesAt is the zones that act on entering, still open to b, that hold its center: a bit each.
func (h *Hole) ZonesAt(b *Ball) (in uint64) {
	for i := range h.Zones {
		if z := &h.Zones[i]; z.enterer != nil && z.open(b) && z.contains(b.P) {
			in |= 1 << i
		}
	}
	return in
}

// ActsOnEntering says whether z acts when a ball enters it (a pad, a hazard...), not by forces.
func (z *Zone) ActsOnEntering() bool { return z.enterer != nil }

// WouldAct says whether z, which acts on entering, would do something to b if it entered it now:
// not a checkpoint already set, a key already held.
// A booster is left out: whether it acts depends on the way the ball was heading as it came in,
// which a bounce later in the frame changes.
func (z *Zone) WouldAct(b *Ball) bool {
	if _, ok := z.enterer.(*speedpad); ok {
		return false
	}
	c := *b
	return z.enterer.enter(&c)
}

// DepthAt is how deep a ball centered on p is in the collider it is deepest in, among those it does
// not go through (gates it has the key of), and which one; 0 and -1 when in none. More than BallR:
// its center is inside. The moving colliders are taken where they are at time t; with t < 0, only
// the still ones are looked at.
func (h *Hole) DepthAt(p Vec3, keys uint8, t float64) (depth float64, idx int) {
	idx = -1
	for _, i32 := range h.grid.at(p.X, p.Z) {
		c := &h.Colliders[i32]
		if c.Motion != nil && t < 0 || c.Key != 0 && keys&(1<<(c.Key-1)) != 0 {
			continue
		}
		if ct, ok := c.contactAt(p, max(t, 0), &h.Cup); ok && ct.depth > depth {
			depth, idx = ct.depth, int(i32)
		}
	}
	return depth, idx
}
