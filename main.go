// P’tits Trous: multiplayer minigolf. The game server, the physics engine, the web client (web/)
// and the maps (maps/).
package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"trounormand/internal/game"
	"trounormand/internal/physics"
	"trounormand/maps"
)

//go:embed web
var web embed.FS

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if n, err := strconv.Atoi(os.Getenv(key)); err == nil && n > 0 {
		return n
	}
	return def
}

func main() {
	// `trou-normand healthcheck`, for Docker (the image has no shell): is the server accepting connections?
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		conn, err := net.DialTimeout("tcp", "127.0.0.1:"+env("PORT", "3000"), 2*time.Second)
		if err != nil {
			os.Exit(1)
		}
		conn.Close()
		return
	}

	holes, err := maps.Holes()
	if err != nil {
		log.Fatal(err)
	}
	// The picture of each hole, drawn when the game is built (go run ./tools/previews, which a hook
	// runs after a change to a map or to how the game draws), found by the hole's key.
	var drawn map[string]string
	if data, err := web.ReadFile("web/previews/previews.json"); err == nil {
		json.Unmarshal(data, &drawn)
	}
	previews, missing := make([]string, len(holes)), 0
	for i, hole := range holes {
		if file, ok := drawn[game.HoleKey(hole)]; ok {
			previews[i] = "/previews/" + file
		} else {
			missing++
		}
	}
	if missing > 0 {
		log.Printf("%d holes have no picture: run go run ./tools/previews", missing)
	}
	cfg := game.Config{
		MaxRooms:   envInt("MAX_ROOMS", 200),
		TrustProxy: os.Getenv("TRUST_PROXY") == "1",
		Previews:   previews,
	}
	// DEV_MAPS=1 (development, run from the repository): each hole is read from maps/ again when a
	// room starts it, so a hole rebuilt by node tools/maps/build.mjs is played at once. Files added
	// or removed still need a restart.
	if os.Getenv("DEV_MAPS") == "1" {
		names := maps.Files()
		cfg.Reload = func(i int) (*physics.Hole, error) {
			data, err := os.ReadFile(filepath.Join("maps", names[i]))
			if err != nil {
				return nil, err
			}
			return physics.ParseHole(data)
		}
		log.Printf("DEV_MAPS: holes are read from maps/ each time they start")
	}
	hub := game.NewHub(cfg, holes)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	mux.HandleFunc("GET /ws", hub.ServeWS)
	// The client. A browser asks every time whether its copy is still good, and it is for as long
	// as this server runs: the files are in the binary.
	client, _ := fs.Sub(web, "web")
	files, etag := http.FileServerFS(client), fmt.Sprintf(`"%x"`, time.Now().UnixNano())
	// The pictures of the holes: a new picture has a new name, so a browser keeps them for good.
	mux.HandleFunc("GET /previews/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		files.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("ETag", etag)
		files.ServeHTTP(w, r)
	})
	srv := &http.Server{
		Addr:              net.JoinHostPort(env("HOST", "0.0.0.0"), env("PORT", "3000")),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      time.Minute,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    16 << 10,
	}

	// On a stop the players are told the server restarts (net/http knows nothing of websockets).
	stop, done := make(chan os.Signal, 1), make(chan struct{})
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-stop
		srv.Close()
		hub.Close()
		close(done)
	}()
	log.Printf("trou normand: %d holes, http://%s", len(holes), srv.Addr)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatal(err)
	}
	<-done
}
