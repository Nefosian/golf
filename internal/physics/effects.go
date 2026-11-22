package physics

import (
	"errors"
	"math"
)

// The built-in effects. Adding one: a struct for its params, check, then enter (something
// happens as the ball comes in), field (forces while it is in) or both, and a line in init.
// Whatever it does may depend on the ball and its params only, and anything it puts in the ball
// must be a field of Ball.

func init() {
	register("speedpad", func() Effect { return new(speedpad) })
	register("jumppad", func() Effect { return new(jumppad) })
	register("launcher", func() Effect { return new(launcher) })
	register("teleport", func() Effect { return new(teleport) })
	register("hazard", func() Effect { return new(hazard) })
	register("checkpoint", func() Effect { return new(checkpoint) })
	register("strokes", func() Effect { return new(strokes) })
	register("key", func() Effect { return new(key) })
	register("wind", func() Effect { return new(wind) })
	register("magnet", func() Effect { return new(magnet) })
}

// maxPush is the strongest acceleration a zone may add (u/s²): gravity is 18.
const maxPush = 40

// flat is the unit horizontal direction of d, if it has one.
func flat(d Vec3) (Vec3, error) {
	l := math.Hypot(d.X, d.Z)
	if l < 1e-9 {
		return Vec3{}, errors.New("needs a horizontal dir")
	}
	return Vec3{X: d.X / l, Z: d.Z / l}, nil
}

func speedOK(s float64) error {
	if s <= 0 || s > maxSpeed {
		return errors.New("needs a speed in (0, 24]")
	}
	return nil
}

// speedpad sends the ball along Dir at Speed (its vertical speed is kept).
type speedpad struct {
	Dir   Vec3    `json:"dir"`
	Speed float64 `json:"speed"`
}

func (e *speedpad) check(*Hole, *Zone) (err error) {
	if e.Dir, err = flat(e.Dir); err != nil {
		return err
	}
	return speedOK(e.Speed)
}

func (e *speedpad) enter(b *Ball) bool {
	b.V.X, b.V.Z = e.Dir.X*e.Speed, e.Dir.Z*e.Speed
	return true
}

// jumppad throws the ball up at Speed (its horizontal speed is kept).
type jumppad struct {
	Speed float64 `json:"speed"`
}

func (e *jumppad) check(*Hole, *Zone) error { return speedOK(e.Speed) }

func (e *jumppad) enter(b *Ball) bool {
	b.V.Y, b.on = e.Speed, support{}
	return true
}

// launcher sets the speed of the ball to V, whatever it was: a cannon, a catapult.
type launcher struct {
	V Vec3 `json:"v"`
}

func (e *launcher) check(*Hole, *Zone) error { return speedOK(e.V.len()) }

func (e *launcher) enter(b *Ball) bool {
	b.V = e.V
	if e.V.Y > 0 {
		b.on = support{}
	}
	return true
}

// teleport moves the ball to To (its center), at the same speed, turned by Turn radians around
// the vertical (counterclockwise seen from above).
type teleport struct {
	To   Vec3    `json:"to"`
	Turn float64 `json:"turn,omitempty"`
}

func (e *teleport) check(h *Hole, z *Zone) error {
	if z.contains(e.To) {
		return errors.New("its exit is inside it")
	}
	return nil // Build checks that no exit is inside another teleporter
}

func (e *teleport) enter(b *Ball) bool {
	c, s := math.Cos(e.Turn), math.Sin(e.Turn)
	b.P, b.V, b.on = e.To, Vec3{c*b.V.X + s*b.V.Z, b.V.Y, -s*b.V.X + c*b.V.Z}, support{}
	return true
}

func (e *teleport) exit() Vec3 { return e.To }

// hazard is water, lava, the void: a penalty stroke and back to the last place it was played
// from (the game does it).
type hazard struct{}

func (*hazard) check(*Hole, *Zone) error { return nil }

func (*hazard) enter(b *Ball) bool {
	b.Out = true
	return true
}

// checkpoint makes At the place a penalty puts the ball back: on the highest floor at or under At.
type checkpoint struct {
	At Vec3 `json:"at"`
}

func (e *checkpoint) check(h *Hole, _ *Zone) error {
	f, y, _ := h.floorUnder(e.At.X, e.At.Z, e.At.Y)
	if f < 0 {
		return errors.New("is not over a floor")
	}
	e.At.Y = y + BallR
	return nil
}

func (e *checkpoint) enter(b *Ball) bool {
	if b.Respawn == e.At {
		return false
	}
	b.Respawn = e.At
	return true
}

// strokes takes Add strokes off the player (a coin worth -1): a bonus, always once.
type strokes struct {
	Add int `json:"add"`
}

func (e *strokes) check(*Hole, *Zone) error {
	if e.Add < -8 || e.Add > -1 {
		return errors.New("needs add in [-8, -1]: a bonus")
	}
	return nil
}

func (e *strokes) enter(b *Ball) bool {
	b.Strokes += e.Add
	return true
}

// key gives the ball key Key (1 to 8): the gates (colliders) of that key let it through.
type key struct {
	Key uint8 `json:"key"`
}

func (e *key) check(*Hole, *Zone) error {
	if e.Key < 1 || e.Key > 8 {
		return errors.New("needs key in [1, 8]")
	}
	return nil
}

func (e *key) enter(b *Ball) bool {
	bit := uint8(1) << (e.Key - 1)
	if b.Keys&bit != 0 {
		return false
	}
	b.Keys |= bit
	return true
}

// wind pushes the ball with Accel (u/s²) while it is in: wind, a fan, a conveyor belt, a current.
type wind struct {
	Accel Vec3 `json:"accel"`
}

func (e *wind) check(h *Hole, _ *Zone) error {
	a := e.Accel.len()
	if a == 0 || a > maxPush {
		return errors.New("needs an accel of at most 40")
	}
	h.accel += a
	return nil
}

func (e *wind) field(_ *Ball, f field) field {
	f.push = f.push.add(e.Accel)
	return f
}

// magnet pulls the ball towards At, horizontally, with Accel (u/s²; negative pushes away).
type magnet struct {
	At    Vec3    `json:"at"`
	Accel float64 `json:"accel"`
}

func (e *magnet) check(h *Hole, _ *Zone) error {
	if e.Accel == 0 || math.Abs(e.Accel) > maxPush {
		return errors.New("needs an accel of at most 40")
	}
	h.accel += math.Abs(e.Accel)
	return nil
}

func (e *magnet) field(b *Ball, f field) field {
	if d, err := flat(e.At.sub(b.P)); err == nil {
		f.push = f.push.add(d.scale(e.Accel))
	}
	return f
}
