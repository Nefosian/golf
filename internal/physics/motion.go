package physics

import (
	"errors"
	"math"
)

// Motion makes a collider move over and over, as a function of the hole time and nothing else:
// a slide there and back, a turn (full turns, or a swing), or both. A client draws it with the
// same formulas on the hole clock (frame / fps).
//
// At time t, with u = t/Period + Phase: the slide is Move*(1-cos 2πu)/2; the angle around Axis
// through Pivot (which slides along) is 2πu, or Swing*sin 2πu when Swing is set.
type Motion struct {
	Period float64 `json:"period"`          // s
	Phase  float64 `json:"phase,omitempty"` // share of a period at time 0
	Move   Vec3    `json:"move"`            // from where it is to there, and back
	Pivot  Vec3    `json:"pivot"`
	Axis   Vec3    `json:"axis"`            // zero: no turn
	Swing  float64 `json:"swing,omitempty"` // radians each way; 0: full turns

	speed float64 // the fastest any point of the collider goes
}

// state is the slide and its speed, and the angle and its speed, at time t.
func (m *Motion) state(t float64) (off, offVel Vec3, angle, spin float64) {
	u := 2 * math.Pi * (t/m.Period + m.Phase)
	w := 2 * math.Pi / m.Period
	off, offVel = m.Move.scale((1-math.Cos(u))/2), m.Move.scale(w/2*math.Sin(u))
	switch {
	case m.Axis == Vec3{}:
	case m.Swing == 0:
		angle, spin = u, w
	default:
		angle, spin = m.Swing*math.Sin(u), m.Swing*w*math.Cos(u)
	}
	return
}

// posed is where a moving collider is at time t: its center and rotation.
func (col *Collider) posed(t float64) (Vec3, mat3) {
	m := col.Motion
	off, _, angle, _ := m.state(t)
	if angle == 0 {
		return col.C.add(off), col.m
	}
	r := rotation(m.Axis, angle)
	return m.Pivot.add(r.apply(col.C.sub(m.Pivot))).add(off), r.mul(&col.m)
}

// velocity is the speed of the point x of a moving collider at time t.
func (col *Collider) velocity(x Vec3, t float64) Vec3 {
	m := col.Motion
	off, offVel, _, spin := m.state(t)
	r := x.sub(m.Pivot.add(off))
	a := m.Axis.scale(spin)
	return offVel.add(Vec3{a.Y*r.Z - a.Z*r.Y, a.Z*r.X - a.X*r.Z, a.X*r.Y - a.Y*r.X})
}

// reach is how far the points of a collider can be from its center.
func (col *Collider) reach() float64 {
	if col.Shape == Cyl {
		return math.Hypot(col.R, col.HH)
	}
	return col.bound
}

// sweep is a sphere a moving collider never leaves.
func (col *Collider) sweep() (c Vec3, r float64) {
	m := col.Motion
	if m.Axis == (Vec3{}) {
		return col.C.add(m.Move.scale(0.5)), col.reach() + m.Move.len()/2
	}
	return m.Pivot.add(m.Move.scale(0.5)), col.C.sub(m.Pivot).len() + col.reach() + m.Move.len()/2
}

func (col *Collider) buildMotion() error {
	m := col.Motion
	if m.Period <= 0 {
		return errors.New("a motion needs a period")
	}
	if l := m.Axis.len(); l > 0 {
		m.Axis = m.Axis.scale(1 / l)
		if col.Shape == Cyl && (math.Abs(m.Axis.X) > 1e-9 || math.Abs(m.Axis.Z) > 1e-9) {
			return errors.New("a cylinder only turns around a vertical axis")
		}
	}
	turn := 0.0
	if m.Axis != (Vec3{}) {
		turn = 2 * math.Pi / m.Period
		if m.Swing != 0 {
			turn *= math.Abs(m.Swing)
		}
		turn *= col.C.sub(m.Pivot).len() + col.reach()
	}
	m.speed = m.Move.len()*math.Pi/m.Period + turn
	if m.speed > maxSpeed {
		return errors.New("a moving collider goes faster than a ball can")
	}
	return nil
}

// near says whether a ball centered on p is within margin of a moving collider at time t.
func (col *Collider) near(p Vec3, t, margin float64) bool {
	e := *col
	e.Motion, e.HasCup = nil, false
	e.C, e.m = col.posed(t)
	e.H, e.R, e.HH = e.H.add(Vec3{margin, margin, margin}), e.R+margin, e.HH+margin
	e.bound = e.H.len()
	_, ok := e.contactAt(p, t, nil)
	return ok
}

// wakeAt is the first frame from k on that a moving collider may move a ball at rest on p, or
// NoWake. Each frame is looked at at its start, with room for what the collider covers in a
// frame; a motion is periodic, so one period tells.
func (w *World) wakeAt(p Vec3, k int) int {
	h := w.Hole
	if h.speed == 0 {
		return NoWake
	}
	first := NoWake
	for _, i := range h.grid.at(p.X, p.Z) {
		col := &h.Colliders[i]
		if col.Motion == nil {
			continue
		}
		margin := col.Motion.speed*Tick + 1e-6
		for f, last := k, k+int(math.Ceil(col.Motion.Period*FPS)); f <= last && f < first; f++ {
			if col.near(p, float64(f-1)*Tick, margin) {
				first = f
			}
		}
	}
	return first
}

// rotation is the rotation by angle around a unit axis.
func rotation(a Vec3, angle float64) mat3 {
	c, s := math.Cos(angle), math.Sin(angle)
	k := 1 - c
	return mat3{
		c + a.X*a.X*k, a.X*a.Y*k - a.Z*s, a.X*a.Z*k + a.Y*s,
		a.Y*a.X*k + a.Z*s, c + a.Y*a.Y*k, a.Y*a.Z*k - a.X*s,
		a.Z*a.X*k - a.Y*s, a.Z*a.Y*k + a.X*s, c + a.Z*a.Z*k,
	}
}

func (a *mat3) apply(v Vec3) Vec3 {
	return Vec3{a[0]*v.X + a[1]*v.Y + a[2]*v.Z, a[3]*v.X + a[4]*v.Y + a[5]*v.Z, a[6]*v.X + a[7]*v.Y + a[8]*v.Z}
}

func (a *mat3) mul(b *mat3) (r mat3) {
	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			r[i*3+j] = a[i*3]*b[j] + a[i*3+1]*b[3+j] + a[i*3+2]*b[6+j]
		}
	}
	return r
}
