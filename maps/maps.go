// Package maps holds the maps of the game: a hole per JSON file (see physics.Hole), embedded in the
// binary.
package maps

import (
	"embed"
	"fmt"
	"io/fs"

	"trounormand/internal/physics"
)

//go:embed *.json
var files embed.FS

// Holes are the holes of the game: the maps in file name order.
func Holes() ([]*physics.Hole, error) {
	var holes []*physics.Hole
	names, _ := fs.Glob(files, "*.json")
	for _, name := range names {
		data, _ := files.ReadFile(name)
		hole, err := physics.ParseHole(data)
		if err != nil {
			return nil, fmt.Errorf("maps/%s: %v", name, err)
		}
		holes = append(holes, hole)
	}
	return holes, nil
}
