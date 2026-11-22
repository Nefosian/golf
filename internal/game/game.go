package game

import (
	"fmt"
	"time"

	"trounormand/internal/physics"
)

// startGame starts a game with the room's settings: false when they leave nothing to play.
func (r *Room) startGame(t float64) bool {
	course := r.settings.course()
	if len(course) == 0 {
		return false
	}
	r.play, r.course = r.settings, course
	for _, m := range r.members {
		m.scores = []int{}
	}
	r.startHole(0, t)
	return true
}

// limit is the strokes a player has on the hole at position pos of the course.
func (r *Room) limit(pos int) int {
	if r.play.Strokes > 0 {
		return r.play.Strokes
	}
	return r.hub.holes[r.course[pos]].StrokeLimit()
}

// startHole starts the hole at position pos of the course. Nobody waits for ever: once a player
// finished it the others have the countdown, and the hole lasts the limit at most; then those who
// have not finished count their stroke limit.
func (r *Room) startHole(pos int, t float64) {
	idx := r.course[pos]
	hole := r.hub.holes[idx]
	r.pos, r.endsAt, r.limitAt = pos, 0, r.play.Limit*60*physics.FPS
	r.holeSeq++
	r.quit = map[uint32]bool{}
	r.sim = newSim(hole, r.holeSeq, r.broadcast, r.limit(pos), hole.Solo || !r.play.Collisions)
	r.startAt = t
	for _, m := range r.members {
		r.tee(m)
	}
	r.holeMsg = textFrame(fmt.Appendf(nil, `{"t":"hole","seq":%d,"hole":%s}`, r.holeSeq, r.hub.holeJSON[idx]))
	r.broadcast(r.holeMsg)
	r.sim.tell(0, true)
	r.push()
}

func (r *Room) tee(m *member) {
	if m.ball == nil {
		m.ball = &ball{id: m.s.id}
	}
	r.sim.add(m.ball)
	for len(m.scores) < r.pos { // holes played before this member joined
		m.scores = append(m.scores, r.limit(len(m.scores)))
	}
}

// score sets m's strokes on the hole being played, once it has finished it.
func (r *Room) score(m *member, strokes int) { m.scores = append(m.scores[:r.pos], strokes) }

// giveUp ends the current hole for m on frame n, if it has not finished it: it counts the limit.
func (r *Room) giveUp(m *member, n int) bool {
	if !r.sim.giveUp(m.ball, n) {
		return false
	}
	r.score(m, r.sim.limit)
	return true
}

// endHole moves on to the next hole, or ends the game (the scores stay until the next one starts).
func (r *Room) endHole(t float64) {
	s := r.sim
	for _, m := range r.members {
		g := s.state(m.ball, s.now)
		if !g.finished {
			g.finished, g.strokes = true, g.limit
			r.score(m, g.limit)
		}
		m.ball.track.restart(s.now, g) // the hole stops there
	}
	if r.pos+1 < len(r.course) {
		r.startHole(r.pos+1, t)
		return
	}
	r.sim, r.holeMsg = nil, nil
	r.broadcast(textFrame([]byte(`{"t":"over"}`)))
	r.push()
}

// stop ends the game now, by the owner: the scores of the holes that are over stay.
func (r *Room) stop() {
	for _, m := range r.members {
		m.scores = m.scores[:min(len(m.scores), r.pos)]
	}
	r.sim, r.holeMsg = nil, nil
	r.broadcast(textFrame([]byte(`{"t":"stopped"}`)))
	r.push()
}

// tick brings the room up to hub time t and returns how long it can sleep before the next tick:
// until something happens that the room has to act on, a second at most.
func (r *Room) tick(t float64) time.Duration {
	if t-r.lastGC >= 1 {
		r.lastGC = t
		if r.housekeeping(t); r.closed {
			return 0
		}
	}
	if r.sim == nil {
		if r.dirty {
			r.push()
		}
		return tickIdle
	}
	n := r.sync(t)
	if r.over(n) || (r.endsAt > 0 && n >= r.endsAt) || n >= r.limitAt {
		if r.endHole(t); r.sim == nil {
			return tickIdle
		}
		n = r.sim.now
	}
	if r.dirty {
		r.push()
	}
	f := r.wake(n)
	if f == never {
		return tickIdle // nothing planned: everybody waits for a shot
	}
	next := r.startAt + float64(f+1)/physics.FPS // a frame late rather than early
	return min(tickIdle, time.Duration((next-t)*float64(time.Second)))
}

// sync brings the hole to hub time t, rounded up to a frame a path can start on, and the scores
// with it. It returns that frame.
func (r *Room) sync(t float64) int {
	n := int((t - r.startAt) * physics.FPS)
	for _, e := range r.sim.advance(max(r.sim.now, (n+pathStep-1)/pathStep*pathStep)) {
		if e.kind == evHoled || e.kind == evMaxed {
			r.score(r.member(e.who), int(e.value))
			if r.endsAt == 0 {
				r.endsAt = e.frame + r.play.Countdown*physics.FPS
			}
		}
		r.dirty = true
	}
	return r.sim.now
}

// done says whether the hole waits no longer for a ball on a frame it is on p: it is not moving,
// and its player has finished the hole or is not there.
func done(p pose, connected bool) bool { return !p.is(bitMoving) && (p.is(bitFinished) || !connected) }

// over says whether the hole is over on frame n: every ball done, and a player there.
func (r *Room) over(n int) bool {
	conn := 0
	for _, m := range r.members {
		c := m.s.connected()
		if !done(m.ball.track.at(n), c) {
			return false
		}
		if c {
			conn++
		}
	}
	return conn > 0
}

// wake is the next frame after n the room has something to do on: an event that changes the
// scores, computing what follows the tracks, the end of the hole.
func (r *Room) wake(n int) int {
	next, overAt, conn := never, n, 0
	for _, m := range r.members {
		t := &m.ball.track
		for _, e := range t.events {
			if scoring(e.kind) {
				next = min(next, e.frame)
				break
			}
		}
		if !known(&t.last) {
			next = min(next, r.sim.until-lead)
		}
		c := m.s.connected()
		if c {
			conn++
		}
		// the hole can end once this ball is done for good
		if overAt == never || !done(t.at(t.end()), c) {
			overAt = never
			continue
		}
		f := t.end()
		for f > max(n, t.from) && done(t.at(f-1), c) {
			f--
		}
		overAt = max(overAt, f)
	}
	if conn > 0 {
		next = min(next, overAt)
	}
	if r.endsAt > 0 {
		next = min(next, r.endsAt)
	}
	return max(n+1, min(next, r.limitAt))
}
