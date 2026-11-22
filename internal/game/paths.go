package game

import (
	"cmp"
	"encoding/binary"
	"math"
	"slices"
	"sync"
)

// scratch is what tell needs to build a message. The rooms share a few of them.
type scratch struct {
	path   []pose
	events []event
	buf    []byte
}

var scratches = sync.Pool{New: func() any { return new(scratch) }}

// tell sends the players the paths frame (see proto.go) of what changed in the tracks from frame
// n0 on: the path of each ball that will not go where they were last told (all of them with full),
// and everything that is going to happen after n0, with the input events of n0 first.
func (s *sim) tell(n0 int, full bool, input ...event) {
	sc := scratches.Get().(*scratch)
	defer scratches.Put(sc)

	buf := append(sc.buf[:0], make([]byte, frameHead)...)
	buf = append(buf, msgPath)
	buf = binary.LittleEndian.AppendUint16(buf, uint16(s.seq))
	buf = binary.LittleEndian.AppendUint32(buf, uint32(n0))
	count := len(buf)
	buf = append(buf, 0, 0)
	segments := 0
	for _, b := range s.balls {
		if !full && !b.changed {
			continue
		}
		// where it is every pathStep frames until it is still, or no more is known; a jump where
		// a penalty put it back or a teleporter moved it
		t, path := &b.track, sc.path[:0]
		e := 0
		for f := n0; ; f += pathStep {
			p := t.at(f)
			for ; e < len(t.events) && t.events[e].frame <= f; e++ {
				if k := t.events[e].kind; (k == evOut || k == evTeleport) && t.events[e].frame > n0 {
					p.bits |= bitJump
				}
			}
			path = append(path, p)
			if f >= t.end() {
				break
			}
		}
		// a path ends on the first position the ball is still on: its flags hold from there
		for k := len(path) - 1; k > 0 && path[k-1].is(bitHalt) && path[k].on(path[k-1]) && !path[k].is(bitJump); k-- {
			path = path[:k]
		}
		sc.path = path
		var flags uint8
		if t.last.ball.Rest {
			flags |= flagRest
		}
		if t.last.ball.Solid {
			flags |= flagSolid
		}
		if t.last.ball.Holed {
			flags |= flagHoled
		}
		// what the players know from this frame on, and where the new path leaves it
		old := b.told
		if k := (n0 - b.toldAt) / pathStep; k < len(old) {
			old = old[k:]
		} else if len(old) > 0 {
			old = old[len(old)-1:]
		}
		d := 0
		for d < len(path) && d < len(old) && path[d].on(old[d]) && (d == 0 || path[d].is(bitJump) == old[d].is(bitJump)) {
			d++
		}
		if full {
			d = 0
		}
		if d < len(path) || d < len(old) || flags != b.flags || full {
			// from the last position they agree on, one segment per stretch without a jump
			for from := max(d-1, 0); from < len(path); {
				to := from + 1
				for to < len(path) && !path[to].is(bitJump) {
					to++
				}
				buf = binary.LittleEndian.AppendUint32(buf, b.id)
				buf = append(buf, flags)
				buf = binary.LittleEndian.AppendUint16(buf, uint16(from))
				buf = binary.LittleEndian.AppendUint16(buf, uint16(to-from))
				for _, p := range path[from:to] {
					buf = binary.LittleEndian.AppendUint32(buf, math.Float32bits(p.x))
					buf = binary.LittleEndian.AppendUint32(buf, math.Float32bits(p.y))
					buf = binary.LittleEndian.AppendUint32(buf, math.Float32bits(p.z))
				}
				segments++
				from = to
			}
		}
		b.told, b.toldAt, b.flags = append(b.told[:0], path...), n0, flags
	}
	binary.LittleEndian.PutUint16(buf[count:], uint16(segments))

	events := append(sc.events[:0], input...)
	for _, b := range s.balls {
		for _, e := range b.track.events {
			if e.frame > n0 {
				events = append(events, e)
			}
		}
	}
	slices.SortStableFunc(events, func(a, b event) int { return cmp.Compare(a.frame, b.frame) })
	events = events[:min(len(events), math.MaxUint16)]
	sc.events = events
	buf = binary.LittleEndian.AppendUint16(buf, uint16(len(events)))
	for _, e := range events {
		buf = binary.LittleEndian.AppendUint16(buf, uint16(e.frame-n0))
		buf = binary.LittleEndian.AppendUint32(buf, e.who)
		buf = append(buf, e.kind)
		buf = binary.LittleEndian.AppendUint32(buf, math.Float32bits(e.value))
	}
	sc.buf = buf
	// nothing new is still news when events were announced that will not happen after all
	if segments > 0 || len(events) > 0 || n0 < s.toldUpTo {
		s.send(frameInPlace(opBinary, buf))
	}
	if s.toldUpTo = n0; len(events) > 0 {
		s.toldUpTo = events[len(events)-1].frame
	}
}
