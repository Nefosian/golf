// Verify plays every hole the way players would, with the real engine and the real rules, and says
// for each whether it is fit to be played: it can be finished within par, it has no trap, and the
// engine plays it right. See internal/game/verify.go for how. Run it once the maps are done:
//
//	go run ./tools/verify
//
// It exits with 1 when a hole is refused. The same maps and the same code always give the same
// answer.
package main

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"trounormand/internal/game"
	"trounormand/maps"
)

func main() {
	holes, err := maps.Holes()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	t0 := time.Now()
	reports, took := make([]game.Report, len(holes)), make([]time.Duration, len(holes))
	var wg sync.WaitGroup
	for i, h := range holes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			t := time.Now()
			reports[i] = game.Verify(h)
			took[i] = time.Since(t)
		}()
	}
	wg.Wait()
	refused := 0
	for i, r := range reports {
		if r.OK {
			fmt.Printf("ok       %-40s %d stroke(s), par %d · %d places · %d shots · %.1f s\n", r.Hole, r.Strokes, r.Par, r.Places, r.Shots, took[i].Seconds())
			continue
		}
		refused++
		fmt.Printf("REFUSED  %-40s %d places · %d shots · %.1f s\n", r.Hole, r.Places, r.Shots, took[i].Seconds())
		if r.Way != nil {
			fmt.Printf("         way found: %d stroke(s), par %d\n", r.Strokes, r.Par)
		}
		for _, f := range r.Faults {
			fmt.Printf("         %s: %s\n", f.Kind, game.Meaning[f.Kind])
			var where []string
			if f.Detail != "" {
				where = append(where, f.Detail)
			}
			if f.Count > 0 {
				where = append(where, fmt.Sprintf("at (%.2f, %.2f, %.2f), on %d of the %d shots", f.At.X, f.At.Y, f.At.Z, f.Count, r.Shots))
			}
			if len(where) > 0 {
				fmt.Printf("             %s\n", strings.Join(where, ", "))
			}
			if len(f.Shots) > 0 {
				shots := make([]string, len(f.Shots))
				for j, s := range f.Shots {
					shots[j] = s.String()
				}
				fmt.Printf("             to see it again, from the tee: %s\n", strings.Join(shots, " then "))
			}
		}
	}
	fmt.Printf("\n%d holes, %d refused, in %.1f s\n", len(holes), refused, time.Since(t0).Seconds())
	if refused > 0 {
		os.Exit(1)
	}
}
