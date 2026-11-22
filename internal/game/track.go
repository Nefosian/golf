package game

import (
	"slices"

	"trounormand/internal/physics"
)

type event struct {
	frame int
	who   uint32 // player id
	kind  uint8
	value float32
}

// link says that on a frame a ball met another one, or would have: what became of it depends on
// that other ball.
type link struct {
	frame int
	with  uint32 // player id
}

// pose is what the room needs to know of a ball on a frame without playing it.
type pose struct {
	x, y, z float32 // as the players get it
	strokes uint8
	bits    uint8
}

const (
	bitStill    = 1 << iota // still(g)
	bitSolid                // solid(g)
	bitMoving               // moving(g)
	bitFinished             // g.finished
	bitHalt                 // at rest or frozen: what the players call still
	bitJump                 // in a path only: put there, it did not get there from the previous position
)

func see(g *golfer) pose {
	p := pose{x: float32(g.ball.P.X), y: float32(g.ball.P.Y), z: float32(g.ball.P.Z), strokes: uint8(g.strokes)}
	set := func(on bool, bit uint8) {
		if on {
			p.bits |= bit
		}
	}
	set(still(g), bitStill)
	set(solid(g), bitSolid)
	set(moving(g), bitMoving)
	set(g.finished, bitFinished)
	set(g.ball.Rest || g.ball.Frozen, bitHalt)
	return p
}

func (p pose) is(bit uint8) bool { return p.bits&bit != 0 }

func (p pose) on(o pose) bool { return p.x == o.x && p.y == o.y && p.z == o.z }

func (p pose) vec() physics.Vec3 {
	return physics.Vec3{X: float64(p.x), Y: float64(p.y), Z: float64(p.z)}
}

// keyEvery is how many frames apart a track keeps the whole ball, at most.
const keyEvery = 32

// key is the whole ball on frame k.
type key struct {
	k int
	g golfer
}

// track is a ball on the current hole, computed ahead. It is the truth: nothing else moves a ball.
//
// The whole ball is kept only on some frames (keys): the first one, every keyEvery frames, every
// frame it met another ball or started again after staying still. Between two keys it moved on
// its own, so playing it alone from the last key gives it back on any frame (sim.state).
type track struct {
	from   int     // frame of poses[0]
	poses  []pose  // past the last one, the ball stays there if that one is still, else it is not known yet
	keys   []key   // the first one is on frame from or before
	last   golfer  // the ball on the last frame
	events []event // after the frame the hole is on, in order
	links  []link  // in order

	cur   key  // the last ball sim.state played, valid with curOK
	curOK bool // cleared whenever what comes before cur may have changed
}

func (t *track) at(k int) pose { return t.poses[max(0, min(k-t.from, len(t.poses)-1))] }
func (t *track) end() int      { return t.from + len(t.poses) - 1 }

// restart makes g the ball on frame n, with nothing known after it. The slices keep their room:
// a ball rolls again soon, and what it rolls is small.
func (t *track) restart(n int, g golfer) {
	t.from, t.poses, t.keys, t.last = n, append(t.poses[:0], see(&g)), append(t.keys[:0], key{n, g}), g
	t.events, t.links, t.curOK = t.events[:0], t.links[:0], false
}

// diverge forgets what comes after frame k-1 and puts g on frame k.
func (t *track) diverge(k int, g golfer, ev []event, met []uint32) {
	t.poses = t.poses[:max(1, min(len(t.poses), k-t.from))]
	i := len(t.keys)
	for i > 1 && t.keys[i-1].k >= k {
		i--
	}
	t.keys = t.keys[:i]
	i = len(t.events)
	for i > 0 && t.events[i-1].frame >= k {
		i--
	}
	t.events = t.events[:i]
	i = len(t.links)
	for i > 0 && t.links[i-1].frame >= k {
		i--
	}
	t.links, t.curOK = t.links[:i], false
	t.put(k, g, ev, met)
}

// put makes g the ball on frame k, which follows the last one known (the ball stayed still on it
// until then), with what happened to it on that frame.
func (t *track) put(k int, g golfer, ev []event, met []uint32) {
	gap := t.end() < k-1
	for t.end() < k-1 {
		t.poses = append(t.poses, t.poses[len(t.poses)-1])
	}
	t.poses = append(t.poses, see(&g))
	if gap || len(met) > 0 || k-t.keys[len(t.keys)-1].k >= keyEvery {
		t.keys = append(t.keys, key{k, g})
	}
	t.last = g
	t.events = append(t.events, ev...)
	for _, id := range met {
		t.links = append(t.links, link{k, id})
	}
}

// redo replaces what happened to the ball g on frame k, where it ends up the same.
func (t *track) redo(k int, g golfer, ev []event, met []uint32) {
	i, j := span(t.events, k, func(e event) int { return e.frame })
	t.events = slices.Replace(t.events, i, j, ev...)
	i, j = span(t.links, k, func(l link) int { return l.frame })
	t.links = slices.Delete(t.links, i, j)
	for n, id := range met {
		t.links = slices.Insert(t.links, i+n, link{k, id})
	}
	if len(met) > 0 {
		// it met a ball there now: it did not get there on its own
		i, j = span(t.keys, k, func(c key) int { return c.k })
		if i == j {
			t.keys = slices.Insert(t.keys, i, key{k, g})
		}
	}
}

// span is where the items of frame k are in a list in frame order.
func span[T any](list []T, k int, frame func(T) int) (i, j int) {
	for i < len(list) && frame(list[i]) < k {
		i++
	}
	for j = i; j < len(list) && frame(list[j]) == k; j++ {
	}
	return i, j
}

// trim forgets the frames before n: nothing before the frame the hole is on is played again.
func (t *track) trim(n int) {
	if i := min(n-t.from, len(t.poses)-1); i > 0 {
		t.poses = t.poses[:copy(t.poses, t.poses[i:])]
		t.from += i
	}
	if len(t.poses) == 1 {
		t.from = max(t.from, n) // still there
		t.keys = append(t.keys[:0], key{t.from, t.last})
	} else {
		// the last key at or before from is where the ball can be played from
		i := len(t.keys) - 1
		for i > 0 && t.keys[i].k > t.from {
			i--
		}
		t.keys = t.keys[:copy(t.keys, t.keys[i:])]
	}
	i := 0
	for i < len(t.links) && t.links[i].frame <= n {
		i++
	}
	t.links = t.links[:copy(t.links, t.links[i:])]
}
