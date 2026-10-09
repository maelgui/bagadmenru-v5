package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/maelgui/bagadmenru-v5/renderers/go/renderer"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// job is one entry of a MuseScore batch job.json: an input file and a list of
// outputs. Each output is either a filename (string) or a [prefix, suffix] pair
// MuseScore expands into one file per part.
type job struct {
	In  string `json:"in"`
	Out []any  `json:"out"`
}

func runJob(ctx context.Context, jobs []job, workdir string) error {
	jobPath := filepath.Join(workdir, "job.json")
	data, err := json.Marshal(jobs)
	if err != nil {
		return err
	}
	if err := os.WriteFile(jobPath, data, 0o644); err != nil {
		return err
	}

	runCtx, cancel := context.WithTimeout(ctx, time.Duration(envInt("MSCORE_TIMEOUT", 110))*time.Second)
	defer cancel()

	cmd := exec.CommandContext(runCtx, "xvfb-run", "-a", env("MSCORE_BIN", "mscore"), "-F", "-j", jobPath)
	stderr, err := cmd.CombinedOutput()
	if err != nil {
		return &renderer.RenderError{Detail: trim(string(stderr), 500)}
	}
	return nil
}

func render(ctx context.Context, source io.Reader, baseName, workdir string) ([]string, error) {
	src := filepath.Join(workdir, "source.mscz")
	if err := writeFile(src, source); err != nil {
		return nil, err
	}

	conductor := filepath.Join(workdir, baseName+".pdf")
	conductorMP3 := filepath.Join(workdir, baseName+".mp3")
	partPrefix := filepath.Join(workdir, baseName+" - ")

	// MuseScore 4.x headless segfaults at teardown when a single batch job mixes
	// graphic (PDF) and audio (MP3) outputs; each output type on its own exits
	// cleanly. Split into two invocations to avoid the crash.
	if err := runJob(ctx, []job{{In: src, Out: []any{conductor, []string{partPrefix, " part.pdf"}}}}, workdir); err != nil {
		return nil, err
	}
	if err := runJob(ctx, []job{{In: src, Out: []any{conductorMP3}}}, workdir); err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(workdir)
	if err != nil {
		return nil, err
	}
	var outputs []string
	for _, e := range entries {
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if ext == ".pdf" || ext == ".mp3" {
			outputs = append(outputs, filepath.Join(workdir, e.Name()))
		}
	}
	sort.Strings(outputs)
	return outputs, nil
}

func writeFile(path string, src io.Reader) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, src)
	return err
}

func trim(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func main() {
	addr := ":" + env("PORT", "8080")
	fmt.Printf("MuseScore renderer (Go) listening on %s\n", addr)
	if err := http.ListenAndServe(addr, renderer.Handler(render)); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
