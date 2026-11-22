// Previews draws the picture of every hole that the room owner chooses from, into web/previews/,
// with the game's own 3D (web/scene.js) in headless Chrome. The server image is built with fresh
// pictures every time (see the Dockerfile); to see them on a development server, run it first:
//
//	go run ./tools/previews
//
// A picture is named after its hole and the code that draws it: a browser keeps one for good, a
// new picture has a new name. Chrome is found on the PATH (google-chrome-stable, chromium...) or
// given by CHROME.
package main

import (
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"trounormand/internal/game"
	"trounormand/internal/physics"
	"trounormand/maps"
)

// the page Chrome opens: it draws the holes asked for and sends each picture back
//
//go:embed render.html render.js
var page embed.FS

const dir = "web/previews"

// drawing is what a picture depends on besides its hole: its name changes with any of them.
var drawing = []string{"web/scene.js", "web/vendor/three.module.min.js", "web/vendor/GLTFLoader.js", "web/vendor/BufferGeometryUtils.js", "web/models/kit.glb"}

func main() {
	log.SetFlags(0)
	holes, err := maps.Holes()
	if err != nil {
		log.Fatal(err)
	}
	how := sha256.New()
	for _, name := range drawing {
		data, err := os.ReadFile(name)
		if err != nil {
			log.Fatalf("%v (run from the repository)", err)
		}
		how.Write(data)
	}
	for _, name := range []string{"render.html", "render.js"} {
		data, _ := page.ReadFile(name)
		how.Write(data)
	}
	drawn := map[string]string{} // hole key -> picture file
	files := make([]string, len(holes))
	for i, hole := range holes {
		sum := sha256.Sum256(append(how.Sum(nil), game.HoleJSON(hole)...))
		files[i] = hex.EncodeToString(sum[:8]) + ".webp"
		drawn[game.HoleKey(hole)] = files[i]
	}
	if err := os.RemoveAll(dir); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatal(err)
	}
	t0 := time.Now()
	if err := draw(holes, files); err != nil {
		log.Fatalf("previews: %v", err)
	}
	manifest, _ := json.MarshalIndent(drawn, "", "  ")
	if err := os.WriteFile(filepath.Join(dir, "previews.json"), append(manifest, '\n'), 0o644); err != nil {
		log.Fatal(err)
	}
	log.Printf("previews: %d holes drawn in %.1f s", len(holes), time.Since(t0).Seconds())
}

// draw has Chrome draw every hole into dir, each in its file.
func draw(holes []*physics.Hole, files []string) error {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	result := make(chan error, 2)
	mux := http.NewServeMux()
	mux.Handle("GET /", http.FileServerFS(os.DirFS("web")))
	mux.Handle("GET /render/", http.StripPrefix("/render/", http.FileServerFS(page)))
	mux.HandleFunc("GET /holes/{i}", func(w http.ResponseWriter, r *http.Request) {
		i, _ := strconv.Atoi(r.PathValue("i"))
		w.Header().Set("Content-Type", "application/json")
		w.Write(game.HoleJSON(holes[i]))
	})
	mux.HandleFunc("POST /out/{i}", func(w http.ResponseWriter, r *http.Request) {
		i, _ := strconv.Atoi(r.PathValue("i"))
		data, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
		if err == nil && (len(data) < 12 || !bytes.Equal(data[8:12], []byte("WEBP"))) {
			err = errors.New("Chrome did not make a WebP picture")
		}
		if err == nil {
			err = os.WriteFile(filepath.Join(dir, files[i]), data, 0o644)
		}
		if err != nil {
			result <- fmt.Errorf("hole %d: %v", i, err)
		}
	})
	mux.HandleFunc("POST /done", func(http.ResponseWriter, *http.Request) { result <- nil })
	mux.HandleFunc("POST /fail", func(w http.ResponseWriter, r *http.Request) {
		msg, _ := io.ReadAll(r.Body)
		result <- fmt.Errorf("in the page: %s", msg)
	})
	go http.Serve(ln, mux)

	chrome, err := findChrome()
	if err != nil {
		return err
	}
	profile, err := os.MkdirTemp("", "previews-chrome-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(profile)
	todo := make([]string, len(holes))
	for i := range holes {
		todo[i] = strconv.Itoa(i)
	}
	url := fmt.Sprintf("http://%s/render/render.html?todo=%s", ln.Addr(), strings.Join(todo, ","))
	// WebGL without a graphics card: the same pictures on every machine
	args := []string{"--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run",
		"--no-default-browser-check", "--user-data-dir=" + profile}
	if os.Geteuid() == 0 {
		args = append(args, "--no-sandbox") // Chrome will not run as root otherwise (an image build)
	}
	cmd := exec.Command(chrome, append(args, url)...)
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { result <- fmt.Errorf("Chrome stopped: %v", cmd.Wait()) }()
	defer func() {
		cmd.Process.Kill()
		time.Sleep(200 * time.Millisecond) // its last files, before the profile goes
	}()
	select {
	case err := <-result:
		return err
	case <-time.After(5 * time.Minute):
		return errors.New("Chrome took more than 5 minutes")
	}
}

func findChrome() (string, error) {
	if c := os.Getenv("CHROME"); c != "" {
		return c, nil
	}
	for _, name := range []string{"google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}
	return "", errors.New("no Chrome found: install it or set CHROME to its path")
}
