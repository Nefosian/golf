package physics

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
)

// Zone is a volume a ball's center goes through, with an effect: the modifiers of a hole. A zone
// does not move. Its Type names an effect registered with register, its Params are that effect's,
// as the map gives them and as the clients get them.
type Zone struct {
	Type   string          `json:"type"`
	Shape  Shape           `json:"shape"`
	C      Vec3            `json:"c"`
	Rot    Vec3            `json:"rot"`
	H      Vec3            `json:"h"`
	R      float64         `json:"r,omitempty"`
	HH     float64         `json:"hh,omitempty"`
	Once   bool            `json:"once,omitempty"`  // acts on a ball once per hole
	Stage  int             `json:"stage,omitempty"` // in a world, the hole (1, 2...) it belongs to; 0: every one
	Params json.RawMessage `json:"params,omitempty"`

	idx     int
	m       mat3
	bound   float64
	enterer enterer
	fielder fielder
	jumper  jumper
}

// Effect is what a zone does. An effect is a struct its params decode into (unknown fields are
// refused), checked once the hole is built; it acts through one or more of the interfaces below.
type Effect interface {
	check(h *Hole, z *Zone) error
}

// enterer acts at the moment the center of a ball enters the zone (the step is cut there). It
// reports whether it did something: the players are told.
type enterer interface {
	enter(b *Ball) bool
}

// fielder adds to the forces on a ball whose center is in the zone. (By value: a pointer passed
// to an interface would put every field on the heap.)
type fielder interface {
	field(b *Ball, f field) field
}

// jumper moves a ball somewhere else at once: a teleporter.
type jumper interface {
	exit() Vec3
}

var effects = map[string]func() Effect{}

// register makes an effect known by its name in the maps. Built-in effects call it in an init.
func register(name string, make func() Effect) {
	if effects[name] != nil {
		panic("effect " + name + " registered twice")
	}
	effects[name] = make
}

func (z *Zone) build(h *Hole) error {
	z.m = euler(z.Rot)
	switch {
	case z.Shape == Box && min(z.H.X, z.H.Y, z.H.Z) >= maxTravel:
		z.bound = z.H.len()
	case z.Shape == Cyl && min(z.R, z.HH) >= maxTravel:
		z.bound = math.Hypot(z.R, z.HH)
	default:
		// thinner, a ball could go through it within a step without being seen in it
		return fmt.Errorf("is thinner than %g", 2*maxTravel)
	}
	make := effects[z.Type]
	if make == nil {
		return fmt.Errorf("has an unknown type %q", z.Type)
	}
	e := make()
	if len(z.Params) > 0 {
		dec := json.NewDecoder(bytes.NewReader(z.Params))
		dec.DisallowUnknownFields()
		if err := dec.Decode(e); err != nil {
			return fmt.Errorf("%s: %v", z.Type, err)
		}
	}
	if err := e.check(h, z); err != nil {
		return fmt.Errorf("%s: %v", z.Type, err)
	}
	z.enterer, _ = e.(enterer)
	z.fielder, _ = e.(fielder)
	z.jumper, _ = e.(jumper)
	if z.enterer == nil && z.fielder == nil {
		return fmt.Errorf("%s does nothing", z.Type)
	}
	return nil
}

func (z *Zone) contains(p Vec3) bool {
	r := p.sub(z.C)
	if r.dot(r) > z.bound*z.bound {
		return false
	}
	if z.Shape == Cyl {
		return r.X*r.X+r.Z*r.Z <= z.R*z.R && math.Abs(r.Y) <= z.HH
	}
	m := &z.m
	return math.Abs(m[0]*r.X+m[3]*r.Y+m[6]*r.Z) <= z.H.X &&
		math.Abs(m[1]*r.X+m[4]*r.Y+m[7]*r.Z) <= z.H.Y &&
		math.Abs(m[2]*r.X+m[5]*r.Y+m[8]*r.Z) <= z.H.Z
}

// open says whether the zone may still act on b: not a zone that acts once, and that it went through.
func (z *Zone) open(b *Ball) bool { return !z.Once || b.Taken&(1<<z.idx) == 0 }

// inside is the zones with forces that hold p, a bit each: what a step must not cross unseen.
func (h *Hole) inside(p Vec3) (in uint64) {
	if !h.forces {
		return 0
	}
	for _, i := range h.zgrid.at(p.X, p.Z) {
		if z := &h.Zones[i]; z.fielder != nil && z.contains(p) {
			in |= 1 << i
		}
	}
	return in
}

func (h *Hole) applyForces(b *Ball, f field) field {
	for _, i := range h.zgrid.at(b.P.X, b.P.Z) {
		if z := &h.Zones[i]; z.fielder != nil && z.contains(b.P) {
			f = z.fielder.field(b, f)
		}
	}
	return f
}

// entry finds the first zone that acts on entering a ball drifting by h enters, and how far into
// h, by halving the step like touch. A zone that held the ball on from, where its step started, is
// not entered, nor one of done (a bit per zone): those it entered on this step already.
func (w *World) entry(b *Ball, h float64, f *field, from Vec3, done uint64) (first *Zone, at float64) {
	hole := w.Hole
	if !hole.enters {
		return nil, 0
	}
	end, _, _ := b.drift(h, f)
	look := func(cells []int32) {
		for _, i := range cells {
			z := &hole.Zones[i]
			if z.enterer == nil || z == first || done&(1<<i) != 0 || !z.open(b) || !z.contains(end) || z.contains(from) {
				continue
			}
			hi := bisect(h, func(x float64) bool { p, _, _ := b.drift(x, f); return z.contains(p) })
			if first == nil || hi < at {
				first, at = z, hi
			}
		}
	}
	look(hole.zgrid.at(b.P.X, b.P.Z))
	look(hole.zgrid.at(end.X, end.Z))
	return first, at
}

// enter lets zone z act on ball b, which just entered it.
func (w *World) enter(b *Ball, z *Zone) {
	from := b.P
	if !z.enterer.enter(b) {
		return
	}
	if z.Once {
		b.Taken |= 1 << z.idx
	}
	b.V, _ = capSpeed(b.V)
	kind := Entered
	if z.jumper != nil {
		kind = Teleported
	}
	w.Events = append(w.Events, Event{Ball: b, Kind: kind, Ref: z.idx, From: from, To: b.P})
}

// Respawn is where a checkpoint puts a ball back, if z is one.
func (z *Zone) Respawn() (Vec3, bool) {
	if c, ok := z.enterer.(*checkpoint); ok {
		return c.At, true
	}
	return Vec3{}, false
}

// Teleports says whether the hole has teleporters: a ball can then meet balls far from it.
func (h *Hole) Teleports() bool { return len(h.teleports) > 0 }

// Exits appends to dst where a ball on p may reappear within a frame, through a teleporter.
func (h *Hole) Exits(p Vec3, dst []Vec3) []Vec3 {
	for _, i := range h.teleports {
		z := &h.Zones[i]
		if r, lim := p.sub(z.C), z.bound+Reach; r.dot(r) <= lim*lim {
			dst = append(dst, z.jumper.exit())
		}
	}
	return dst
}
