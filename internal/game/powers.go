package game

import (
	"math"

	"trounormand/internal/physics"
)

// The powers (2026-11-26), when the room plays with them (settings.Powers). A player holds two at
// most: one drawn at random at the start of each hole, more from the power boxes of a hole (zones
// "powerup"). Five help one's own next shot, armed before it; three are played against the others.
// Like everything else they are part of the ball's state on its track (golfer): what a power does
// is computed ahead with the rest, and played again the same way.
const (
	powNone   uint8 = iota
	powSuper        // the next shot leaves half as fast again
	powJump         // the next shot hops: over a low wall, a gap
	powGhost        // the next shot goes through the other balls and the moving obstacles
	powSticky       // the next shot brakes hard and does not bounce
	powMagnet       // the cup pulls the next shot in from close by
	powWeight       // against the others: their next shot is weaker
	powFog          // against the others: they play their next shot in a fog (their screen)
	powSwap         // against the ball nearest the cup: it and ours change places
	powCount  = powSwap
)

// curses: what the others' powers did to a ball, until its next shot
const (
	curseWeight uint8 = 1 << iota
	curseFog
)

const (
	superBoost  = 1.5 // a super shot's speed, times a shot's
	jumpUp      = 7.5 // u/s: the hop of a jump shot (about 1.5 high, some 13 long at full power)
	weightShare = 0.6 // what is left of a weighed shot's power
)

// drawPower is a power drawn at random, the same for the same frame, player and draw: a track
// played again draws the same powers.
func drawPower(k int, id uint32, n uint8) uint8 {
	h := uint64(k)*0x9e3779b97f4a7c15 ^ uint64(id)*0xc2b2ae3d27d4eb4f ^ uint64(n+1)*0x165667b19e3779f9
	h ^= h >> 31
	h *= 0x94d049bb133111eb
	h ^= h >> 29
	return uint8(h%uint64(powCount)) + 1
}

// give puts power p in a free hand of g, if it has one.
func (g *golfer) give(p uint8) bool {
	for i := range g.powers {
		if g.powers[i] == powNone {
			g.powers[i] = p
			return true
		}
	}
	return false
}

// arm makes the shot g is about to play carry its armed power and what the others did to it, and
// clears them: a power lasts a shot.
func (g *golfer) arm(power float64) float64 {
	if g.curse&curseWeight != 0 {
		power *= weightShare
	}
	g.curse = 0
	return power
}

// powered gives the ball of g, just shot, the power it had armed.
func (g *golfer) powered() {
	switch g.armed {
	case powSuper:
		g.ball.Boost(superBoost)
	case powJump:
		g.ball.Hop(jumpUp)
	case powGhost:
		g.ball.Power |= physics.PowerGhost
	case powSticky:
		g.ball.Power |= physics.PowerSticky
	case powMagnet:
		g.ball.Power |= physics.PowerPull
	}
	g.armed = powNone
}

// power plays the power in hand slot of b on frame n, and tells the players: false when it cannot
// be played (no power there, another one armed, nobody to play it against).
func (s *sim) power(b *ball, n, slot int) bool {
	if slot < 0 || slot >= len(golfer{}.powers) {
		return false
	}
	g := s.state(b, n)
	p := g.powers[slot]
	if p == powNone || g.finished {
		return false
	}
	changed, ev := []*ball{b}, []event{{n, b.id, evPower, float32(p)}}
	switch p {
	case powSuper, powJump, powGhost, powSticky, powMagnet:
		if g.armed != powNone {
			return false
		}
		g.armed = p
	case powWeight, powFog:
		bit := curseWeight
		if p == powFog {
			bit = curseFog
		}
		for _, o := range s.balls {
			if o == b {
				continue
			}
			og := s.state(o, n)
			if og.finished {
				continue
			}
			og.curse |= bit
			o.track.restart(n, og)
			changed, ev = append(changed, o), append(ev, event{n, o.id, evCursed, float32(p)})
		}
		if len(changed) == 1 {
			return false // nobody left to play it against
		}
	case powSwap:
		// our ball and the one nearest the cup, both at rest, if it is nearer than ours
		if !g.ball.Rest || g.ball.Holed {
			return false
		}
		cup, best, mine := s.hole.Cup, math.Inf(1), 0.0
		dist := func(p physics.Vec3) float64 { return math.Hypot(p.X-cup.X, p.Z-cup.Z) }
		mine = dist(g.ball.P)
		var target *ball
		var tg golfer
		for _, o := range s.balls {
			if o == b {
				continue
			}
			og := s.state(o, n)
			if og.finished || !og.ball.Rest || og.ball.Holed || !og.ball.Solid {
				continue
			}
			if d := dist(og.ball.P); d < best {
				best, target, tg = d, o, og
			}
		}
		if target == nil || best >= mine {
			return false
		}
		ours, theirs := g.ball.P, tg.ball.P
		g.ball.Place(theirs)
		tg.ball.Place(ours)
		g.ball.Respawn, tg.ball.Respawn = theirs, ours
		s.world.Settle(&g.ball, n)
		s.world.Settle(&tg.ball, n)
		target.track.restart(n, tg)
		changed, ev = append(changed, target), append(ev, event{n, target.id, evCursed, float32(p)})
	default:
		return false
	}
	g.powers[slot] = powNone
	b.track.restart(n, g)
	s.replan(n, changed, ev...)
	return true
}
