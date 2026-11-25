package physics

// material is how a collider treats the ball: rolling resistance (a multiplier), restitution on
// landing and on a side hit, and the speed a kicking collider (a bumper) sends it off at.
type material struct {
	friction, bounce, e, kick float64
}

// materials are the names a map gives its colliders. A collider without one gets grass, wall or
// post, after its kind.
var materials = map[string]material{
	"grass":  {1, 0.3, 0.7, 0},
	"wall":   {1, 0.3, 0.72, 0},
	"post":   {1, 0.3, 0.6, 0},
	"ice":    {0.15, 0.3, 0.7, 0},
	"sand":   {5, 0, 0.4, 0}, // a ball that lands in it does not bounce
	"bumper": {1, 0.3, 0.7, 9},
	"jelly":  {1.6, 0.82, 0.8, 0}, // a trampoline, a bouncy castle: a ball that lands on it bounces high, rolls slowly
}
