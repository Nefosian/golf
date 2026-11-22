package game

import (
	"encoding/json"
	"math/rand/v2"
	"slices"
)

// maxPlayers is the most players a room can be set to take: as many as there are colors. Measured
// on 2026-11-18 (one room, everybody shooting every 2.5 s, collisions on), on the hole with forces:
// at 16 a shot holds the room 2 ms at worst, at 32 12 ms, at 50 279 ms; at 100 the room could not
// keep up with real time.
const maxPlayers = 16

// settings are how a room plays, chosen by its owner, in the lobby or at any time: a game uses
// those it started with (Room.play).
type settings struct {
	Public     bool   `json:"public"`     // in the list of rooms
	Max        int    `json:"max"`        // connected players the room takes, 2 to maxPlayers
	Collisions bool   `json:"collisions"` // false: the balls go through each other on every hole; true: as each hole says
	Strokes    int    `json:"strokes"`    // a player has on a hole, 1 to 20; 0: as each hole says
	Countdown  int    `json:"countdown"`  // s the others have to finish a hole once a player has, 10 to 600
	Limit      int    `json:"limit"`      // min a hole lasts at most, 1 to 10
	Mode       string `json:"mode"`       // "random": Holes drawn from Pool; "custom": List, in its order
	Holes      int    `json:"holes"`      // to play in "random", 1 to len(Pool)
	Pool       []int  `json:"pool"`       // the holes "random" draws from: indices in the hub's holes
	List       []int  `json:"list"`       // the course of "custom", a hole may come twice
}

// defaults are the settings of a room whose creator did not say.
func defaults(holes int) settings {
	pool := make([]int, holes)
	for i := range pool {
		pool[i] = i
	}
	return settings{Max: 8, Collisions: true, Countdown: 60, Limit: 3, Mode: "random", Holes: 9, Pool: pool, List: []int{}}
}

// UnmarshalJSON reads the settings a client sent over the defaults: what it leaves out keeps its
// default (the pool: every hole, which clean fills in knowing how many there are). Settings kept by a
// browser from before a setting existed get its default, not its smallest value.
func (s *settings) UnmarshalJSON(data []byte) error {
	type plain settings // the same fields, without this method
	p := plain(defaults(0))
	p.Pool = nil
	if err := json.Unmarshal(data, &p); err != nil {
		return err
	}
	*s = settings(p)
	return nil
}

// clean makes settings a client sent fit to keep: every number within its bounds, every hole one
// that exists. holes is how many the hub has.
func (s *settings) clean(holes int) {
	if s.Pool == nil { // left out
		s.Pool = defaults(holes).Pool
	}
	clamp := func(v, lo, hi int) int { return max(lo, min(hi, v)) }
	s.Max = clamp(s.Max, 2, maxPlayers)
	if s.Strokes != 0 {
		s.Strokes = clamp(s.Strokes, 1, 20)
	}
	s.Countdown = clamp(s.Countdown, 10, 600)
	s.Limit = clamp(s.Limit, 1, 10)
	if s.Mode != "custom" {
		s.Mode = "random"
	}
	invalid := func(i int) bool { return i < 0 || i >= holes }
	s.Pool = slices.Compact(slices.Sorted(slices.Values(slices.DeleteFunc(s.Pool, invalid))))
	s.List = slices.DeleteFunc(s.List, invalid)
	s.List = s.List[:min(len(s.List), 100)]
	if s.Pool == nil { // sent as [], never null: a client reads its length
		s.Pool = []int{}
	}
	if s.List == nil {
		s.List = []int{}
	}
	s.Holes = clamp(s.Holes, 1, max(1, len(s.Pool)))
}

// course is the holes of a game, in order: drawn at random from the pool, or the list. Empty when
// there is nothing to play.
func (s *settings) course() []int {
	if s.Mode == "custom" {
		return slices.Clone(s.List)
	}
	pool := slices.Clone(s.Pool)
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	return pool[:min(s.Holes, len(pool))]
}
