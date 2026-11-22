package game

import (
	"fmt"
	"log"
	"math"
	"runtime/debug"
	"sync"
	"sync/atomic"
	"time"
)

const (
	tickFast = time.Second / 60 // the beat rooms are woken on
	tickIdle = time.Second      // a room sleeps this long at most: housekeeping

	keptSeats = 14 // seats kept for those who dropped, on top of the players: the oldest one goes to a newcomer

	profileDelay = 100 * time.Millisecond // profile changes are told to the room at most this often
)

type member struct {
	s      *Session
	color  int   // of its ball, an index in colors
	scores []int // strokes per hole of the game
	leftAt float64
	ball   *ball // on the current hole, or the last one played; nil before its first
}

// Room is one group of players and, during a game, the hole they play. mu guards everything below it.
type Room struct {
	hub     *Hub
	code    string
	shard   *shard
	due     atomic.Int64              // hub time (ns) of its next tick
	gone    atomic.Bool               // closed, for those who cannot take the lock
	listing atomic.Pointer[roomEntry] // what the list of rooms says of it, for the hub

	mu       sync.Mutex
	closed   bool
	name     string // as its owner called it, or nothing
	settings settings
	members  []*member // in joining order
	owner    *member   // starts the games: who opened the room, then who has been there the longest

	// A game plays the holes of course (indices in the hub's holes) with the settings it started
	// with; pos is the hole being played, its position in course. sim is nil outside a game.
	sim     *sim
	play    settings
	course  []int
	pos     int
	holeSeq int
	startAt float64         // hub time of frame 0 of the hole
	holeMsg []byte          // the current hole, as sent to whoever joins
	endsAt  int             // frame the hole ends on at the latest, once a player finished it; 0 before
	limitAt int             // frame the hole ends on at the latest, whatever happens
	quit    map[uint32]bool // who chose to leave the room during this hole: back, they have given it up
	dirty   bool            // a score changed since the last push

	emptySince float64
	lastGC     float64
}

// do runs fn with the room locked and reports whether the room is still open afterwards.
// A panic closes the room instead of taking the server down.
func (r *Room) do(fn func()) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	defer func() {
		if e := recover(); e != nil {
			log.Printf("room %s crashed, closing it: %v\n%s", r.code, e, debug.Stack())
			r.close()
		}
	}()
	if !r.closed {
		fn()
	}
	return !r.closed
}

// poke asks for a tick right now.
func (r *Room) poke() {
	r.due.Store(0)
	r.shard.wake()
}

// later asks for a tick within d at the latest: what waits for it (dirty) is told once for a
// whole burst of changes.
func (r *Room) later(d time.Duration) {
	due := int64(time.Since(r.hub.start) + d)
	for cur := r.due.Load(); cur > due && !r.due.CompareAndSwap(cur, due); cur = r.due.Load() {
	}
	r.shard.wake()
}

func (r *Room) member(id uint32) *member {
	for _, m := range r.members {
		if m.s.id == id {
			return m
		}
	}
	return nil
}

func (r *Room) connected() (n int) {
	for _, m := range r.members {
		if m.s.connected() {
			n++
		}
	}
	return n
}

func (r *Room) broadcast(wire []byte) {
	for _, m := range r.members {
		m.s.send(wire)
	}
}

// push sends the whole room to its members.
func (r *Room) push() {
	r.dirty = false
	playing := r.sim != nil
	now := 0
	if playing {
		now = r.sim.now
	}
	st := roomMsg{T: "room", Code: r.code, Name: r.name, Owner: r.owner.s.id, Settings: r.settings, Playing: playing, Seq: r.holeSeq,
		Course: r.course, Pos: r.pos, Players: make([]playerInfo, len(r.members))}
	if playing {
		st.Max, st.EndsAt, st.LimitAt = r.sim.limit, r.endsAt, r.limitAt
	}
	if e := (roomEntry{r.code, r.name, r.connected(), r.settings.Max, playing}); !r.settings.Public {
		r.listing.Store(nil)
	} else if r.listing.Load() == nil || *r.listing.Load() != e {
		r.listing.Store(&e)
	}
	for i, m := range r.members {
		var p pose
		if m.ball != nil {
			p = m.ball.track.at(now)
		}
		info := playerInfo{ID: m.s.id, Name: m.s.profile.Load().name, Color: m.color, Connected: m.s.connected(),
			Strokes: int(p.strokes), Finished: p.is(bitFinished), Scores: m.scores}
		// the standings are those of the holes that are over: the same holes for everybody
		over := m.scores
		if playing {
			over = over[:r.pos]
		}
		for _, s := range over {
			info.Total += s
		}
		st.Players[i] = info
	}
	// whoever came in after the game has no score to compare
	ranked := func(i int) bool { return playing || len(r.members[i].scores) > 0 }
	for i := range st.Players {
		if !ranked(i) {
			continue
		}
		st.Players[i].Rank = 1
		for j, o := range st.Players {
			if ranked(j) && o.Total < st.Players[i].Total {
				st.Players[i].Rank++
			}
		}
	}
	r.broadcast(jsonFrame(st))
}

// admit seats s, or gives it its seat back, or says why not.
func (r *Room) admit(s *Session) (refusal []byte) {
	forfeit := false // back on a hole it left: it gave it up
	if r.sim != nil {
		r.sync(r.hub.now()) // who sits changes on a frame a path can start on
	}
	m := r.member(s.id)
	if m == nil {
		if r.connected() >= r.settings.Max {
			return errFrame("full")
		}
		if !s.room.CompareAndSwap(nil, r) {
			return nil // already in another room
		}
		if len(r.members) >= r.settings.Max+keptSeats {
			// fewer than Max are here: the seat of whoever left first goes
			var away *member
			for _, o := range r.members {
				if !o.s.connected() && (away == nil || o.leftAt < away.leftAt) {
					away = o
				}
			}
			r.remove(away.s, "")
		}
		m = &member{s: s, scores: []int{}}
		r.members = append(r.members, m)
		if r.owner == nil {
			r.owner = m
		}
		r.paint(m, s.profile.Load().color)
		if r.sim != nil {
			r.tee(m)
			forfeit = r.quit[s.id] // no second try at a hole by leaving and coming back
		}
	} else if r.connected() > r.settings.Max {
		// back after the room filled up (it counts itself): there is no seat left for it
		r.remove(s, "")
		return errFrame("full")
	} else if !r.free(m.color, m, false) {
		r.paint(m, s.profile.Load().color) // its color went to someone who came in meanwhile
	}
	m.leftAt = 0
	if r.sim != nil {
		s.send(r.holeMsg)
		r.sim.tell(r.sim.now, true)
		if forfeit {
			r.giveUp(m, r.sim.now) // told once it has the hole: a client forgets what came before
		}
	}
	r.push()
	r.poke()
	return nil
}

// left is called when a member's connection drops: it keeps its seat for a while.
func (r *Room) left(s *Session) {
	if m := r.member(s.id); m != nil && !s.connected() {
		m.leftAt = r.hub.now()
		r.push()
	}
}

// profiled is called when a member changed its name or the color it likes.
func (r *Room) profiled(s *Session) {
	if m := r.member(s.id); m != nil {
		if c := s.profile.Load().color; r.free(c, m, true) {
			m.color = c
		}
		r.dirty = true
		r.later(profileDelay)
	}
}

// free says whether no member other than m has that color: among all the members with all set,
// among those connected otherwise.
func (r *Room) free(color int, m *member, all bool) bool {
	for _, o := range r.members {
		if o != m && o.color == color && (all || o.s.connected()) {
			return false
		}
	}
	return true
}

// paint gives m the color its player wants, or the first one nobody here has, or failing that
// (absent players keep theirs) the first one no connected player has. With more players than
// colors, some share one: then it gets the one it wants.
func (r *Room) paint(m *member, want int) {
	for _, all := range [2]bool{true, false} {
		if r.free(want, m, all) {
			m.color = want
			return
		}
		for c := range colors {
			if r.free(c, m, all) {
				m.color = c
				return
			}
		}
	}
	m.color = want
}

func (r *Room) remove(s *Session, reason string) {
	if r.sim != nil {
		r.sync(r.hub.now()) // its ball is there until the frame the new paths start on
	}
	for i, m := range r.members {
		if m.s == s {
			r.members = append(r.members[:i], r.members[i+1:]...)
			break
		}
	}
	s.room.CompareAndSwap(r, nil)
	if reason != "" {
		s.send(textFrame(fmt.Appendf(nil, `{"t":"left","reason":%q}`, reason)))
	}
	if len(r.members) == 0 {
		r.close()
		return
	}
	if r.owner.s == s {
		// the room goes to who has been there the longest, among those who are there if any
		r.owner = r.members[0]
		for _, m := range r.members {
			if m.s.connected() {
				r.owner = m
				break
			}
		}
	}
	if r.sim != nil {
		r.sim.remove(s.id)
		if reason == "left" { // by choice: not a seat taken back, nor a kick
			r.quit[s.id] = true
		}
	}
	r.push()
}

// kick takes a member out of the room, there or not: it may come back with the link.
func (r *Room) kick(id uint32) {
	if o := r.member(id); o != nil && o != r.owner {
		r.remove(o.s, "kicked")
	}
}

func (r *Room) close() {
	if r.closed {
		return
	}
	r.closed = true
	r.gone.Store(true)
	for _, m := range r.members {
		if m.s.room.CompareAndSwap(r, nil) {
			m.s.send(textFrame([]byte(`{"t":"left","reason":"closed"}`)))
		}
	}
	r.members = nil
	r.hub.mu.Lock()
	delete(r.hub.rooms, r.code)
	r.hub.mu.Unlock()
}

// housekeeping closes a deserted room and frees the seats of players who are not coming back.
func (r *Room) housekeeping(t float64) {
	// a game in progress waits longer for its players than a lobby
	emptyFor, seatFor := 30.0, 20.0
	if r.sim != nil {
		emptyFor, seatFor = 90, 600
	}
	if r.connected() > 0 {
		r.emptySince = 0
	} else {
		if r.emptySince == 0 {
			r.emptySince = t
		}
		if t-r.emptySince > emptyFor {
			r.close()
			return
		}
	}
	for _, m := range append([]*member(nil), r.members...) {
		if !m.s.connected() && m.leftAt != 0 && t-m.leftAt > seatFor {
			if r.remove(m.s, ""); r.closed {
				return
			}
		}
	}
}

func (r *Room) handle(s *Session, msg *clientMsg) {
	r.do(func() {
		m := r.member(s.id)
		t := r.hub.now()
		switch {
		case m == nil:
		case msg.T == "start" && m == r.owner:
			if !r.startGame(t) {
				s.send(errFrame("nocourse"))
			}
		case msg.T == "settings" && m == r.owner && msg.Settings != nil:
			msg.Settings.clean(len(r.hub.holes))
			r.name, r.settings = clean(msg.Name, maxRoomName), *msg.Settings
			r.push()
		case msg.T == "giveup":
			if r.sim != nil && r.giveUp(m, r.sync(t)) {
				r.push()
			}
		case msg.T == "stop" && m == r.owner && r.sim != nil:
			r.stop()
		case msg.T == "kick" && m == r.owner:
			r.kick(msg.ID)
		case msg.T == "shoot":
			l := math.Hypot(msg.DX, msg.DZ)
			if msg.Power <= 0 || l < 1e-6 || math.IsInf(l, 0) || r.sim == nil || !r.sim.shoot(m.ball, r.sync(t), msg.DX/l, msg.DZ/l, msg.Power) {
				s.send(errFrame("shot"))
				return
			}
			r.push()
		}
	})
	r.poke()
}
