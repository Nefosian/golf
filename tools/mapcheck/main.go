// Mapcheck checks one hole while it is being built, from its JSON file (maps/ need not build):
// what tools/verify says of it, where shots from the tee (or a spot) end up, and the trace of one
// shot. A building tool, for tools/maps; the game does not use it.
//
//	go run ./tools/mapcheck -file maps/h02-la-cuvette.json -verify
//	go run ./tools/mapcheck -file maps/h02-la-cuvette.json -sweep
//	go run ./tools/mapcheck -file maps/h09-tir-groupe.json -from 0,0,-16 -sweep
//	go run ./tools/mapcheck -file maps/h08-le-carrefour.json -shot 210,0.8
//
// -sweep shoots 360 angles (-angles) × powers 0.1 to 1 by 0.05 from the spot, on frame 0 (-frame).
// An angle is in degrees, the shot going towards (sin a, cos a): 180 is straight ahead (-Z).
package main

import (
	"flag"
	"fmt"
	"math"
	"os"
	"sort"
	"strings"
	"time"

	"trounormand/internal/game"
	"trounormand/internal/physics"
)

func main() {
	path := flag.String("file", "", "the hole's JSON file")
	verify := flag.Bool("verify", false, "run the verifier on it, and print the way it finds")
	sweep := flag.Bool("sweep", false, "sweep angles and powers")
	from := flag.String("from", "", "x,y,z of the floor to shoot from instead of the tee")
	angles := flag.Int("angles", 360, "angles in the sweep")
	frame := flag.Int("frame", 0, "the frame of the hole's clock the shots start on (moving colliders)")
	one := flag.String("shot", "", "degrees,power: trace one shot")
	flag.Parse()
	data, err := os.ReadFile(*path)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	h, err := physics.ParseHole(data)
	if err != nil {
		fmt.Println("REFUSED by the map rules:", err)
		os.Exit(1)
	}
	fmt.Printf("%s: par %d, %d strokes at most\n", h.Name, h.Par, h.StrokeLimit())
	if *verify {
		t := time.Now()
		r := game.Verify(h)
		state := "ok"
		if !r.OK {
			state = "REFUSED"
		}
		fmt.Printf("verify: %s, %d stroke(s) at best, %d places, %d shots, %.1f s\n", state, r.Strokes, r.Places, r.Shots, time.Since(t).Seconds())
		for _, s := range r.Way {
			fmt.Println("   way:", s)
		}
		for _, f := range r.Faults {
			fmt.Printf("   %s: %s\n", f.Kind, game.Meaning[f.Kind])
			if f.Detail != "" {
				fmt.Println("      ", f.Detail)
			}
			if f.Count > 0 {
				fmt.Printf("       at (%.2f, %.2f, %.2f), on %d shots\n", f.At.X, f.At.Y, f.At.Z, f.Count)
			}
			for _, s := range f.Shots {
				fmt.Println("       shot:", s)
			}
		}
		defer func() {
			if !r.OK {
				os.Exit(1)
			}
		}()
	}
	start := h.Tee
	if *from != "" {
		fmt.Sscanf(*from, "%g,%g,%g", &start.X, &start.Y, &start.Z)
		start.Y += physics.BallR
	}
	play := func(w *physics.World, a, p float64, trace bool) physics.Ball {
		b := physics.NewBall(start)
		w.Settle(&b, *frame)
		b.Shoot(math.Sin(a), math.Cos(a), p)
		for k := *frame + 1; k < *frame+1800 && !b.Rest && !b.Holed && !b.Out && b.P.Y > h.KillY; k++ {
			w.Advance(&b, k)
			if trace {
				for _, e := range w.Events {
					if e.Kind == physics.Entered || e.Kind == physics.Teleported {
						fmt.Printf("  frame %d: zone %d (%s)\n", k, e.Ref, h.Zones[e.Ref].Type)
					}
				}
				if k%15 == 0 {
					fmt.Printf("  frame %d: (%.2f, %.2f, %.2f) speed %.2f\n", k, b.P.X, b.P.Y, b.P.Z, math.Sqrt(b.V.X*b.V.X+b.V.Y*b.V.Y+b.V.Z*b.V.Z))
				}
			}
			w.Events = w.Events[:0]
		}
		return b
	}
	if *one != "" {
		var deg, pw float64
		fmt.Sscanf(*one, "%g,%g", &deg, &pw)
		b := play(physics.NewWorld(h), deg*math.Pi/180, pw, true)
		fmt.Printf("  end: (%.2f, %.2f, %.2f) holed %v out %v rest %v\n", b.P.X, b.P.Y, b.P.Z, b.Holed, b.Out || b.P.Y <= h.KillY, b.Rest)
	}
	if !*sweep {
		return
	}
	w := physics.NewWorld(h)
	holed, out, total := 0, 0, 0
	rest := map[[2]int]int{}
	var aces []string
	for i := 0; i < *angles; i++ {
		a := 2 * math.Pi * float64(i) / float64(*angles)
		for p := 0.1; p <= 1.0001; p += 0.05 {
			b := play(w, a, p, false)
			total++
			switch {
			case b.Holed:
				holed++
				if len(aces) < 12 {
					aces = append(aces, fmt.Sprintf("%.1f° %.2f", a*180/math.Pi, p))
				}
			case b.Out || b.P.Y <= h.KillY:
				out++
			default:
				rest[[2]int{int(math.Floor(b.P.X)), int(math.Floor(b.P.Z))}]++
			}
		}
	}
	fmt.Printf("sweep from (%.2f, %.2f, %.2f): %d shots, %.1f%% holed, %.1f%% out\n", start.X, start.Y, start.Z, total, 100*float64(holed)/float64(total), 100*float64(out)/float64(total))
	if len(aces) > 0 {
		fmt.Println("holed, e.g.:", strings.Join(aces, " | "))
	}
	type cell struct {
		at [2]int
		n  int
	}
	var cells []cell
	for k, n := range rest {
		cells = append(cells, cell{k, n})
	}
	sort.Slice(cells, func(i, j int) bool { return cells[i].n > cells[j].n })
	fmt.Println("where balls rest most (1×1 cells, x,z):")
	for i := 0; i < len(cells) && i < 12; i++ {
		fmt.Printf("  (%d..%d, %d..%d): %.1f%%\n", cells[i].at[0], cells[i].at[0]+1, cells[i].at[1], cells[i].at[1]+1, 100*float64(cells[i].n)/float64(total))
	}
}
