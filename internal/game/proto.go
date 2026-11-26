package game

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"strings"
	"unicode"

	"trounormand/internal/physics"
)

// Wire protocol. The server owns every rule and every number of the game: a client only draws
// what it is sent (camera, graphics, sound, interpolation between two positions) and turns the
// player's gesture into a "shoot".
//
// Client -> server, JSON text frames:
//
//	{"t":"hello","token":"..."}                first message; the token is the player across reconnections
//	{"t":"profile","name":"Lea","color":3}     who the player is, at any time: a name (or none) and the
//	                                           index of one of the colors of "welcome"
//	{"t":"rooms"}                              outside a room: ask for the public rooms
//	{"t":"create","name":"...","settings":{}}  open a room, named or not, and sit in it as its owner; the
//	                                           settings are those of "room" (none: the defaults)
//	{"t":"join","code":"ABCDE","listed":true}  listed: picked in the list of rooms, refused if it went private
//	{"t":"leave"}
//	{"t":"settings","name":"...","settings":{}} the room's name and settings (the owner, at any time: a game
//	                                           keeps those it started with)
//	{"t":"start"}                              start a game with the room's settings (the owner, at any time)
//	{"t":"shoot","dx":0,"dz":-1,"power":0.5}   power in (0, 1]
//	{"t":"power","slot":0}                     play the power in hand slot (0 or 1): one for the next shot is
//	                                           armed, one against the others acts at once (powers.go)
//	{"t":"giveup"}                             give up the current hole: the player counts its stroke limit,
//	                                           its ball stays where it is, a ghost
//	{"t":"stop"}                               end the game, back to the lobby (the owner)
//	{"t":"kick","id":7}                        take a player out of the room (the owner); it may come back with
//	                                           the link
//
// Server -> client, JSON text frames:
//
//	{"t":"welcome","id":1,"name":"Lea","color":3,"colors":["#e63946",...],"holes":["lane",...],
//	 "previews":["/previews/3f2a....webp",...]}
//	{"t":"rooms","rooms":[{"code":"ABCDE","name":"...","players":3,"max":10,"playing":false}]}
//	{"t":"room","code":"ABCDE","name":"...","owner":1,"settings":{...},"playing":true,...}   see roomMsg
//	{"t":"hole","seq":3,"hole":{...}}          the hole that starts: physics.Hole, plus the numbers a client
//	                                           needs: ballR, cupDepth, fps (frames per second of the hole
//	                                           clock) and pathStep (frames between two positions of a path).
//	                                           Its colliders may have a material, a key (a gate) and a motion
//	                                           (to draw with physics.Motion's formulas on the hole clock); its
//	                                           zones have a type and the params of that type, as in the map
//	{"t":"left","reason":"left"}               or "closed", "kicked"
//	{"t":"stopped"}                            the owner ended the game: a "room" follows
//	{"t":"over"}                               the last hole is over: a "room" with the final scores follows
//	{"t":"err","code":"notfound"}              or "full", "private" (went private since
//	                                           the list was sent), "nocourse" (no hole to play), "locked" (too many wrong codes), "busy" (too many
//	                                           rooms), "shot" (a "shoot" that was not played), "power" (a "power"
//	                                           that was not played)
//
// and one binary frame, the paths. The server does not send where the balls are, many times a
// second: as soon as something sets a ball in motion it sends where every ball is going to be,
// until they are all still, and what is going to happen to them. A client plays that back on the
// hole clock.
//
//	u8  1 (paths)      u16 hole sequence      u32 frame: the hole time the paths start on
//	u16 n   then n x { u32 player id, u8 flags, u16 skip, u16 count, count x { f32 x, f32 y, f32 z } }
//	u16 n   then n x { u16 frames after the start, u32 player id, u8 event, f32 value }
//
// All little-endian. Each of the first n is a segment of the path of a ball: its positions every
// pathStep frames, the first one skip*pathStep frames after the start. A segment replaces all
// that was known of the ball from its first position on; the ball then stays on the last one,
// with these flags. Between two positions of a segment the ball moves in a straight line. A
// segment that starts where the ball was already known to be on that frame goes on with the
// path: that is how a path that changes further on, or is sent again, comes. Any other segment
// is a jump: the ball stays where it was, then is where the segment starts (a ball put back
// after a penalty, or out of a teleporter). Only the balls whose path is new are there.
// The events are all that happens after the start: those announced earlier for later frames are
// void, and what a client has already played of them is not to be played again.
//
// Paths are sent when a hole starts and when a player comes in (all the balls), on every shot,
// when a player leaves, and a second before a ball that still rolls runs out of path, or before
// a moving collider may move a ball at rest. Every "shoot" from a player in a room is answered:
// by paths with a shot event if it was played, by the "shot" error otherwise. Paths start on the frame of what
// caused them, so they reach a client a little after their start: web/net.js shows how a client
// catches up without a jump.
const msgPath = 1

// Ball flags.
const (
	flagRest  = 1
	flagSolid = 2 // has been shot on this hole: the other balls bounce off it
	flagHoled = 4
)

// Events, and their value.
const (
	evShot     = 1  // the power of the shot
	evHoled    = 2  // the strokes of the player on the hole
	evOut      = 3  // out of bounds or in a hazard, one penalty stroke and the ball is put back: the strokes
	evMaxed    = 4  // out of strokes: the strokes
	evFloor    = 5  // a bounce on a floor: the speed of the hit (u/s)
	evWall     = 6  // on a wall: the same
	evPost     = 7  // on a post: the same
	evCup      = 8  // on the cup: the same
	evBall     = 9  // on another ball: the same
	evKick     = 10 // a bumper sent the ball off: the index of the collider in the hole
	evZone     = 11 // a zone acted on the ball: the index of the zone in the hole
	evTeleport = 12 // a teleporter moved the ball, a jump in its path: the index of the zone
	evStrokes  = 13 // a zone changed the strokes of the player: the strokes
	evGaveUp   = 14 // the player gave up the hole: the strokes
	evPower    = 15 // the player played a power: which (powers.go)
	evPowerGot = 16 // the player got a power from a box: which
	evCursed   = 17 // another player's power hit this one: which
)

// fromPhysics is the event for what the physics reports.
var fromPhysics = [...]uint8{
	physics.HitFloor:   evFloor,
	physics.HitWall:    evWall,
	physics.HitPost:    evPost,
	physics.HitCup:     evCup,
	physics.HitBall:    evBall,
	physics.Kicked:     evKick,
	physics.Entered:    evZone,
	physics.Teleported: evTeleport,
}

type clientMsg struct {
	T        string    `json:"t"`
	Token    string    `json:"token"`
	Name     string    `json:"name"` // of the player (profile) or of the room (create)
	Color    int       `json:"color"`
	Code     string    `json:"code"`
	Listed   bool      `json:"listed"`
	Settings *settings `json:"settings"`
	ID       uint32    `json:"id"` // of a player (kick)
	DX       float64   `json:"dx"`
	DZ       float64   `json:"dz"`
	Power    float64   `json:"power"`
	Slot     int       `json:"slot"` // of a power in hand
}

const (
	opText   = 1
	opBinary = 2
	opClose  = 8
	opPing   = 9
)

// wsFrame builds a server-to-client frame: final fragment, no mask, no extension. Messages are
// encoded once as frames and shared by all their recipients.
func wsFrame(op byte, payload []byte) []byte {
	return frameInPlace(op, append(make([]byte, frameHead, frameHead+len(payload)), payload...))
}

var pingFrame = wsFrame(opPing, nil)

// frameHead is the room a message leaves before its payload for frameInPlace to write the header.
const frameHead = 10

// frameInPlace turns buf, frameHead free bytes then a payload, into a frame.
func frameInPlace(op byte, buf []byte) []byte {
	switch n := len(buf) - frameHead; {
	case n < 126:
		buf[8], buf[9] = 0x80|op, byte(n)
		return buf[8:]
	case n < 1<<16:
		buf[6], buf[7] = 0x80|op, 126
		binary.BigEndian.PutUint16(buf[8:], uint16(n))
		return buf[6:]
	default:
		buf[0], buf[1] = 0x80|op, 127
		binary.BigEndian.PutUint64(buf[2:], uint64(n))
		return buf
	}
}

func textFrame(payload []byte) []byte { return wsFrame(opText, payload) }

func jsonFrame(v any) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err) // only plain structs are marshalled
	}
	return textFrame(data)
}

// HoleJSON is a hole as clients get it (the hole of "hole"), with the numbers a client needs to
// draw it and to play paths: it has none of its own.
func HoleJSON(hole *physics.Hole) []byte {
	data, err := json.Marshal(struct {
		*physics.Hole
		BallR    float64 `json:"ballR"`
		CupDepth float64 `json:"cupDepth"`
		FPS      int     `json:"fps"`
		PathStep int     `json:"pathStep"`
	}{hole, physics.BallR, physics.CupDepth, physics.FPS, pathStep})
	if err != nil {
		panic(err)
	}
	return data
}

// HoleKey names a hole by what clients get of it: the same key, the same hole drawn the same way.
// The pictures of the holes are found by it (tools/previews).
func HoleKey(hole *physics.Hole) string {
	sum := sha256.Sum256(HoleJSON(hole))
	return hex.EncodeToString(sum[:8])
}

func errFrame(code string) []byte { return textFrame([]byte(`{"t":"err","code":"` + code + `"}`)) }

type welcomeMsg struct {
	T      string   `json:"t"`
	ID     uint32   `json:"id"`
	Name   string   `json:"name"` // what the server remembers of this player
	Color  int      `json:"color"`
	Colors []string `json:"colors"`
	Holes  []string `json:"holes"`
	// the address of each hole's picture, "" for a hole without one: they never change, a new
	// picture has a new address
	Previews []string `json:"previews"`
}

// The colors a ball can have. A player asks for one by its index; two players of a room do not
// get the same one as long as there are enough.
var colors = []string{"#e63946", "#ff8a1f", "#ffd23f", "#ff6fb5", "#8b5cf6", "#3a6ff7", "#2ec4f1", "#ffffff", "#2b2d42", "#b5651d",
	"#c2185b", "#14b8a6", "#0b3d91", "#ffb4a2", "#b39ddb", "#8d99ae"}

const (
	maxName     = 16 // runes
	maxRoomName = 24
	maxListed   = 50 // public rooms a client is told of
)

// clean makes user text fit to keep and to show: no control or format characters (invisible ones,
// those that turn the text around), single spaces, at most max runes. Names are optional: a
// client shows its own words for a player or a room without one.
func clean(s string, max int) string {
	var b strings.Builder
	n, space := 0, false
	for _, r := range s {
		if unicode.IsSpace(r) {
			space = n > 0
			continue
		}
		if unicode.IsControl(r) || unicode.Is(unicode.Cf, r) {
			continue
		}
		if space {
			if n+1 >= max {
				break
			}
			b.WriteByte(' ')
			n++
			space = false
		}
		if n >= max {
			break
		}
		b.WriteRune(r)
		n++
	}
	return b.String()
}

// roomEntry is a public room in the list of those one can walk into.
type roomEntry struct {
	Code    string `json:"code"`
	Name    string `json:"name"`
	Players int    `json:"players"` // connected
	Max     int    `json:"max"`
	Playing bool   `json:"playing"`
}

type playerInfo struct {
	ID        uint32 `json:"id"`
	Name      string `json:"name"`
	Color     int    `json:"color"` // in this room
	Connected bool   `json:"connected"`
	Strokes   int    `json:"strokes"` // on the current hole
	Finished  bool   `json:"finished"`
	Scores    []int  `json:"scores"`           // strokes per hole of the game
	Total     int    `json:"total"`            // strokes over the holes that are over
	Rank      int    `json:"rank"`             // on that total: 1 for the fewest, shared when equal; 0: took no part in the game
	Powers    []int  `json:"powers,omitempty"` // in hand on the current hole, 0 where there is none (when the game plays with powers)
	Armed     int    `json:"armed,omitempty"`  // the power the next shot carries
	Curse     int    `json:"curse,omitempty"`  // what the others' powers did to the next shot: 1 weighed, 2 in a fog
}

// roomMsg is the whole state of a room, pushed to its members whenever something changes.
type roomMsg struct {
	T        string       `json:"t"`
	Code     string       `json:"code"`
	Name     string       `json:"name"`
	Owner    uint32       `json:"owner"` // the player who sets and starts the games
	Settings settings     `json:"settings"`
	Playing  bool         `json:"playing"`
	Seq      int          `json:"seq"`        // of the current hole
	Course   []int        `json:"course"`     // the holes of the game in progress, or of the last one: indices in "holes"
	Pos      int          `json:"pos"`        // of the current hole in course: scores[i] is course[i]
	Max      int          `json:"maxStrokes"` // on the current hole
	EndsAt   int          `json:"endsAt"`     // frame of the hole clock the hole ends on, once a player finished it; 0: not yet
	LimitAt  int          `json:"limitAt"`    // frame of the hole clock the hole ends on at the latest
	Players  []playerInfo `json:"players"`
}

const (
	codeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	codeLen   = 5
)

func randomCode() string {
	var b [codeLen]byte
	rand.Read(b[:])
	for i := range b {
		b[i] = codeChars[int(b[i])%len(codeChars)]
	}
	return string(b[:])
}
