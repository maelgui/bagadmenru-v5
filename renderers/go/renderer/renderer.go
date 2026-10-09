// Package renderer owns the HTTP surface shared by every score renderer
// sidecar (DrumScore, MuseScore, ...). Each renderer runs a different
// third-party tool with its own binary, dependencies and invocation, but they
// all expose the same contract to the backend: a GET /health probe and a
// POST /convert that takes an uploaded source file plus a base_name form field
// and returns the generated outputs as base64. A renderer provides only a
// RenderFunc; everything HTTP-shaped lives here, identically for all of them.
package renderer

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// RenderFunc turns the uploaded source into output files written under workdir,
// returning their paths. Returning a RenderError surfaces its detail to the
// backend as a 422; any other error becomes a generic 422 "render failed".
type RenderFunc func(ctx context.Context, source io.Reader, baseName, workdir string) ([]string, error)

// RenderError carries a renderer-specific failure detail (typically the tool's
// stderr) that the contract forwards verbatim in the 422 response body.
type RenderError struct{ Detail string }

func (e *RenderError) Error() string { return e.Detail }

type output struct {
	Name       string `json:"name"`
	ContentB64 string `json:"content_b64"`
}

type convertResponse struct {
	Outputs []output `json:"outputs"`
}

// Handler builds the HTTP handler implementing the renderer contract.
func Handler(render RenderFunc) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /convert", func(w http.ResponseWriter, r *http.Request) {
		convert(w, r, render)
	})
	return mux
}

func convert(w http.ResponseWriter, r *http.Request, render RenderFunc) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		fail(w, http.StatusBadRequest, "invalid multipart body")
		return
	}

	baseName := r.FormValue("base_name")
	if baseName == "" {
		fail(w, http.StatusUnprocessableEntity, "base_name is required")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		fail(w, http.StatusUnprocessableEntity, "file is required")
		return
	}
	defer file.Close()

	workdir, err := os.MkdirTemp("", "render-*")
	if err != nil {
		fail(w, http.StatusInternalServerError, "cannot create workdir")
		return
	}
	defer os.RemoveAll(workdir)

	paths, err := render(r.Context(), file, baseName, workdir)
	if err != nil {
		detail := "render failed"
		var re *RenderError
		if errors.As(err, &re) && re.Detail != "" {
			detail = re.Detail
		}
		fail(w, http.StatusUnprocessableEntity, detail)
		return
	}
	if len(paths) == 0 {
		fail(w, http.StatusUnprocessableEntity, "no output produced")
		return
	}

	outputs := make([]output, 0, len(paths))
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			fail(w, http.StatusInternalServerError, "cannot read output")
			return
		}
		outputs = append(outputs, output{
			Name:       filepath.Base(p),
			ContentB64: base64.StdEncoding.EncodeToString(data),
		})
	}
	writeJSON(w, http.StatusOK, convertResponse{Outputs: outputs})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, status int, detail string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(detail))
}
