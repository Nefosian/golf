// Package physics is the authoritative minigolf simulation: a ball rolling and bouncing on boxes
// and cylinders (some of them moving), through zones that act on it, towards a cup. A Hole is
// immutable once built and shared by every room playing it; all mutable state lives in World and
// Ball, and everything depends on the time of the hole, never the clock.
package physics

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
)

const (
	BallR    = 0.18
	CupR     = 0.45
	CupDepth = 0.6
)

type Vec3 struct{ X, Y, Z float64 }

func (a Vec3) add(b Vec3) Vec3      { return Vec3{a.X + b.X, a.Y + b.Y, a.Z + b.Z} }
func (a Vec3) sub(b Vec3) Vec3      { return Vec3{a.X - b.X, a.Y - b.Y, a.Z - b.Z} }
func (a Vec3) scale(k float64) Vec3 { return Vec3{a.X * k, a.Y * k, a.Z * k} }
func (a Vec3) dot(b Vec3) float64   { return a.X*b.X + a.Y*b.Y + a.Z*b.Z }
func (a Vec3) len() float64         { return math.Sqrt(a.dot(a)) }

func (a Vec3) MarshalJSON() ([]byte, error) {
	return fmt.Appendf(nil, "[%g,%g,%g]", a.X, a.Y, a.Z), nil
}

// UnmarshalJSON reads [x, y, z]: three numbers, no more, no fewer.
func (a *Vec3) UnmarshalJSON(data []byte) error {
	var v []*float64
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	if len(v) != 3 || v[0] == nil || v[1] == nil || v[2] == nil {
		return fmt.Errorf("a vector is [x, y, z], not %s", data)
	}
	*a = Vec3{*v[0], *v[1], *v[2]}
	return nil
}

// mat3 is a row-major rotation matrix.
type mat3 [9]float64

// euler is the rotation for Euler angles in XYZ order (R = Rx * Ry * Rz).
func euler(r Vec3) mat3 {
	a, b := math.Cos(r.X), math.Sin(r.X)
	c, d := math.Cos(r.Y), math.Sin(r.Y)
	e, f := math.Cos(r.Z), math.Sin(r.Z)
	return mat3{
		c * e, -c * f, d,
		a*f + b*e*d, a*e - b*f*d, -b * c,
		b*f - a*e*d, b*e + a*f*d, a * c,
	}
}

type Shape uint8

const (
	Box Shape = iota
	Cyl       // vertical cylinder
)

type Kind uint8

const (
	Floor Kind = iota
	Wall
	Post
)

type Collider struct {
	Shape    Shape   `json:"shape"`
	Kind     Kind    `json:"kind"`
	HasCup   bool    `json:"hasCup,omitempty"`   // the floor the cup is cut into (set by Build)
	C        Vec3    `json:"c"`                  // center
	Rot      Vec3    `json:"rot"`                // Euler XYZ
	H        Vec3    `json:"h"`                  // box half extents
	R        float64 `json:"r,omitempty"`        // cylinder radius
	HH       float64 `json:"hh,omitempty"`       // cylinder half height
	Material string  `json:"material,omitempty"` // a name in materials; none: grass, wall or post, after Kind
	Key      uint8   `json:"key,omitempty"`      // a gate: the balls with this key (1 to 8) go through
	Motion   *Motion `json:"motion,omitempty"`   // nil: it does not move

	m     mat3
	bound float64
	surf  surface
}

type Cup struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
	R float64 `json:"r"`
}

// DefaultMaxStrokes is the strokes a player has on a hole that does not say.
const DefaultMaxStrokes = 8

// DefaultPar is the par of a hole that does not say.
const DefaultPar = 3

// themes are the looks a hole may be dressed in: the client draws them (web/scene.js THEMES), the
// game does not play them.
var themes = map[string]bool{"bocage": true, "ville": true, "quai": true, "canyon": true, "chateau": true, "banquise": true, "nuit": true,
	"fete": true, "ferme": true, "galaxie": true, "noel": true, "volcan": true, "pirate": true}

// Hole is a playable course. Fill the exported fields (or ParseHole), then call Build once.
type Hole struct {
	Name      string     `json:"name"`
	Tee       Vec3       `json:"tee"` // ball center on the tee
	Cup       Cup        `json:"cup"`
	KillY     float64    `json:"killY"` // a ball below this height is out of bounds (set by Build)
	Colliders []Collider `json:"colliders"`
	Zones     []Zone     `json:"zones,omitempty"`

	// The rules of the hole, when not the usual ones.
	Gravity    float64 `json:"gravity,omitempty"`    // u/s², 0: Gravity
	MaxStrokes int     `json:"maxStrokes,omitempty"` // 0: DefaultMaxStrokes
	Par        int     `json:"par,omitempty"`        // the strokes a good shot takes, what a score is said against (birdie...); 0: DefaultPar (set by Build)
	Solo       bool    `json:"solo,omitempty"`       // the balls go through each other

	Theme string `json:"theme,omitempty"` // the look the client dresses it in (web/scene.js THEMES); "": bocage

	// A world (2026-11-26) is a course of several holes on one ground: each of its holes is a map of
	// its own with the whole ground, its own tee and cup, played one after the other. Flags are where
	// the other cups of the world are, for the client to show (they are not cut in the ground).
	World string `json:"world,omitempty"`
	Stage int    `json:"stage,omitempty"` // its place in its world, from 1
	Flags []Vec3 `json:"flags,omitempty"`

	grid, zgrid grid
	g           float64 // gravity
	calm        field   // the forces where no zone adds any
	accel       float64 // the strongest acceleration a ball can have here, but for the contacts
	speed       float64 // the fastest a moving collider goes
	enters      bool    // a zone acts on entering
	forces      bool    // a zone adds forces
	teleports   []int
}

// ParseHole reads a hole from JSON, as a map file gives it, and builds it.
func ParseHole(data []byte) (*Hole, error) {
	h := new(Hole)
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(h); err != nil {
		return nil, err
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, errors.New("something follows the hole")
	}
	return h, h.Build()
}

func (h *Hole) StrokeLimit() int {
	if h.MaxStrokes > 0 {
		return h.MaxStrokes
	}
	return DefaultMaxStrokes
}

func (h *Hole) Build() error {
	if len(h.Colliders) == 0 || h.Cup.R <= 0 {
		return errors.New("a hole needs colliders and a cup")
	}
	if h.MaxStrokes < 0 || h.MaxStrokes > 20 {
		return errors.New("maxStrokes is 1 to 20")
	}
	if h.Par < 0 || h.Par > 20 {
		return errors.New("par is 1 to 20")
	}
	if h.Par == 0 {
		h.Par = DefaultPar
	}
	if h.Theme != "" && !themes[h.Theme] {
		return fmt.Errorf("unknown theme %q", h.Theme)
	}
	if len(h.Flags) > 8 {
		return errors.New("a world has 9 holes at most: 8 other flags")
	}
	h.g, h.speed, h.enters, h.forces, h.teleports = Gravity, 0, false, false, nil
	if h.Gravity != 0 {
		h.g = h.Gravity
	}
	if h.g <= 0 || h.g > 3*Gravity {
		return errors.New("gravity is in (0, 54]")
	}
	h.accel, h.calm = h.g, field{g: h.g}
	minY, cupFloor := math.Inf(1), -1
	for i := range h.Colliders {
		c := &h.Colliders[i]
		if c.Kind > Post {
			return fmt.Errorf("collider %d has an unknown kind %d", i, c.Kind)
		}
		c.m = euler(c.Rot)
		c.HasCup = false
		switch {
		case c.Shape == Box && c.H.X > 0 && c.H.Y > 0 && c.H.Z > 0:
			c.bound = c.H.len()
		case c.Shape == Cyl && c.R > 0 && c.HH > 0 && c.Kind != Floor:
		default:
			return fmt.Errorf("collider %d has no volume", i)
		}
		if err := c.buildSurface(); err != nil {
			return fmt.Errorf("collider %d: %v", i, err)
		}
		if c.Key > 8 {
			return fmt.Errorf("collider %d: key is 1 to 8", i)
		}
		if c.Motion != nil {
			if err := c.buildMotion(); err != nil {
				return fmt.Errorf("collider %d: %v", i, err)
			}
			h.speed = max(h.speed, c.Motion.speed)
		}
		minY = math.Min(minY, c.C.Y)

		// the cup is cut into one flat, axis-aligned floor that stays put
		if c.Kind != Floor || c.Rot != (Vec3{}) || c.Motion != nil {
			continue
		}
		cup := h.Cup
		x0, x1, z0, z1 := c.C.X-c.H.X, c.C.X+c.H.X, c.C.Z-c.H.Z, c.C.Z+c.H.Z
		nx, nz := math.Max(x0, math.Min(x1, cup.X)), math.Max(z0, math.Min(z1, cup.Z))
		if math.Hypot(nx-cup.X, nz-cup.Z) >= cup.R {
			continue
		}
		inside := cup.X-cup.R > x0 && cup.X+cup.R < x1 && cup.Z-cup.R > z0 && cup.Z+cup.R < z1
		if math.Abs(c.C.Y+c.H.Y-cup.Y) > 1e-6 {
			continue // under the cup's level, or over it: see validate
		}
		if !inside || cupFloor >= 0 {
			return errors.New("the cup must sit fully inside exactly one flat floor")
		}
		cupFloor = i
	}
	if cupFloor < 0 {
		return errors.New("the cup is not on a flat floor")
	}
	h.Colliders[cupFloor].HasCup = true
	if _, y, _ := h.floorUnder(h.Tee.X, h.Tee.Z, h.Tee.Y-BallR); math.Abs(y+BallR-h.Tee.Y) > 1e-6 {
		return errors.New("the tee is not on a floor")
	}

	if len(h.Zones) > 64 {
		return errors.New("a hole has 64 zones at most") // a bit each in Ball.Taken
	}
	for i := range h.Zones {
		z := &h.Zones[i]
		z.idx = i
		if err := z.build(h); err != nil {
			return fmt.Errorf("zone %d %v", i, err)
		}
		h.enters = h.enters || z.enterer != nil
		h.forces = h.forces || z.fielder != nil
		if z.jumper != nil {
			h.teleports = append(h.teleports, i)
		}
	}
	for _, i := range h.teleports {
		if to := h.Zones[i].jumper.exit(); to.Y < h.Cup.Y && h.Cup.over(to.X, to.Z, 0, 0) {
			return fmt.Errorf("zone %d: its exit is under the cup", i)
		}
		for _, j := range h.teleports {
			if h.Zones[j].contains(h.Zones[i].jumper.exit()) {
				return fmt.Errorf("zone %d: its exit is inside teleporter %d", i, j)
			}
		}
	}

	if err := h.inBounds(); err != nil {
		return err
	}
	h.KillY = minY - 2.5
	h.grid.build(len(h.Colliders), func(i int) (cx, cz, ex, ez float64) { return h.Colliders[i].footprint() })
	h.zgrid.build(len(h.Zones), func(i int) (cx, cz, ex, ez float64) {
		z := &h.Zones[i]
		ex, ez = extent(z.Shape, &z.m, z.H, z.R, 0)
		return z.C.X, z.C.Z, ex, ez
	})
	return h.validate()
}

// buildSurface sets how the collider treats the ball, from its material.
func (c *Collider) buildSurface() error {
	name := c.Material
	if name == "" {
		name = [...]string{Floor: "grass", Wall: "wall", Post: "post"}[c.Kind]
	}
	m, ok := materials[name]
	if !ok {
		return fmt.Errorf("unknown material %q", name)
	}
	kind := HitFloor
	switch c.Kind {
	case Wall:
		kind = HitWall
	case Post:
		kind = HitPost
	}
	c.surf = surface{m.friction, m.bounce, m.e, m.kick, kind}
	return nil
}

// floorUnder is the static floor whose top is the highest under (x, z) and not above ceil: its index,
// its height there and its normal; index -1 where there is none.
func (h *Hole) floorUnder(x, z, ceil float64) (idx int, y float64, n Vec3) {
	idx, y = -1, math.Inf(-1)
	for i := range h.Colliders {
		col := &h.Colliders[i]
		m, hf := &col.m, col.H
		nn := Vec3{m[1], m[4], m[7]}
		if col.Kind != Floor || nn.Y < 0.3 || col.Motion != nil {
			continue
		}
		top := col.C.add(nn.scale(hf.Y))
		yy := top.Y - (nn.X*(x-top.X)+nn.Z*(z-top.Z))/nn.Y
		d := Vec3{x, yy, z}.sub(top)
		along, across := d.X*m[0]+d.Y*m[3]+d.Z*m[6], d.X*m[2]+d.Y*m[5]+d.Z*m[8]
		if math.Abs(along) <= hf.X+1e-6 && math.Abs(across) <= hf.Z+1e-6 && yy > y && yy <= ceil+1e-6 {
			idx, y, n = i, yy, nn
		}
	}
	return idx, y, n
}

// grid is the broadphase: the colliders (or zones) a ball can touch, by XZ cell.
type grid struct {
	x0, z0, inv float64
	nx, nz      int
	cells       [][]int32 // indices, in increasing order
}

// extent is the half-size of the footprint of a box or a vertical cylinder, grown by pad.
func extent(shape Shape, m *mat3, h Vec3, r, pad float64) (ex, ez float64) {
	if shape == Cyl {
		return r + pad, r + pad
	}
	return math.Abs(m[0])*h.X + math.Abs(m[1])*h.Y + math.Abs(m[2])*h.Z + pad,
		math.Abs(m[6])*h.X + math.Abs(m[7])*h.Y + math.Abs(m[8])*h.Z + pad
}

// over says whether an XZ box, of center (cx, cz) and half-size (ex, ez), reaches into the circle of the cup.
func (c *Cup) over(cx, cz, ex, ez float64) bool {
	dx, dz := max(math.Abs(cx-c.X)-ex, 0), max(math.Abs(cz-c.Z)-ez, 0)
	return dx*dx+dz*dz < c.R*c.R
}

// footprint is the XZ center and half-size of where a ball can touch the collider, wherever it moves.
func (c *Collider) footprint() (cx, cz, ex, ez float64) {
	const pad = BallR + 1e-6
	if c.Motion != nil {
		s, r := c.sweep()
		return s.X, s.Z, r + pad, r + pad
	}
	ex, ez = extent(c.Shape, &c.m, c.H, c.R, pad)
	return c.C.X, c.C.Z, ex, ez
}

// build puts n items, each with the XZ center and half-size of its footprint, in cells.
func (g *grid) build(n int, footprint func(i int) (cx, cz, ex, ez float64)) {
	*g = grid{}
	if n == 0 {
		return
	}
	cell := 2.0 // doubled until the grid is a reasonable size
	x0, z0, x1, z1 := math.Inf(1), math.Inf(1), math.Inf(-1), math.Inf(-1)
	for i := 0; i < n; i++ {
		cx, cz, ex, ez := footprint(i)
		x0, x1 = math.Min(x0, cx-ex), math.Max(x1, cx+ex)
		z0, z1 = math.Min(z0, cz-ez), math.Max(z1, cz+ez)
	}
	for (x1-x0)/cell*((z1-z0)/cell) > 1<<16 {
		cell *= 2
	}
	inv := 1 / cell
	index := func(v, origin float64) int { return int((v - origin) * inv) }
	*g = grid{x0: x0, z0: z0, inv: inv, nx: index(x1, x0) + 1, nz: index(z1, z0) + 1}
	g.cells = make([][]int32, g.nx*g.nz)
	for i := 0; i < n; i++ {
		cx, cz, ex, ez := footprint(i)
		for iz := index(cz-ez, z0); iz <= index(cz+ez, z0); iz++ {
			for ix := index(cx-ex, x0); ix <= index(cx+ex, x0); ix++ {
				g.cells[iz*g.nx+ix] = append(g.cells[iz*g.nx+ix], int32(i))
			}
		}
	}
}

// at returns the colliders a ball centered on (x, z) can touch.
func (g *grid) at(x, z float64) []int32 {
	fx, fz := (x-g.x0)*g.inv, (z-g.z0)*g.inv
	if !(fx >= 0 && fz >= 0 && fx < float64(g.nx) && fz < float64(g.nz)) { // also rejects NaN
		return nil
	}
	return g.cells[int(fz)*g.nx+int(fx)]
}
