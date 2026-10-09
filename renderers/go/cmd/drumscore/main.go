package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
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

func render(ctx context.Context, source io.Reader, baseName, workdir string) ([]string, error) {
	indir := filepath.Join(workdir, "in")
	outdir := filepath.Join(workdir, "out")
	if err := os.MkdirAll(indir, 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(outdir, 0o755); err != nil {
		return nil, err
	}

	srcPath := filepath.Join(indir, baseName+".ds")
	if err := writeFile(srcPath, source); err != nil {
		return nil, err
	}

	runCtx, cancel := context.WithTimeout(ctx, time.Duration(envInt("DSE_TIMEOUT", 110))*time.Second)
	defer cancel()

	cmd := exec.CommandContext(runCtx, "xvfb-run", "-a", env("DSE_BIN", "DrumScoreEditor"), "createPDF", indir, outdir)
	stderr, _ := cmd.CombinedOutput()

	pdfs, _ := filepath.Glob(filepath.Join(outdir, "*.pdf"))
	sort.Strings(pdfs)
	if len(pdfs) == 0 {
		return nil, &renderer.RenderError{Detail: trim(string(stderr), 500)}
	}
	return pdfs, nil
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
	fmt.Printf("DrumScore renderer (Go) listening on %s\n", addr)
	if err := http.ListenAndServe(addr, renderer.Handler(render)); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
