package renderer

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func postConvert(t *testing.T, h http.Handler, fields map[string]string, fileField, fileName string, fileBytes []byte) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		_ = mw.WriteField(k, v)
	}
	if fileField != "" {
		fw, err := mw.CreateFormFile(fileField, fileName)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = fw.Write(fileBytes)
	}
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/convert", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	return rr
}

func TestHealth(t *testing.T) {
	h := Handler(func(context.Context, io.Reader, string, string) ([]string, error) { return nil, nil })
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var got map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["status"] != "ok" {
		t.Fatalf("health = %v, want status=ok", got)
	}
}

// TestConvertSuccess checks the full contract: the RenderFunc receives the
// uploaded bytes and base_name, writes an output, and the handler returns it
// base64-encoded. It also sends an extra "format" form field the backend emits,
// to confirm the handler tolerates unknown fields.
func TestConvertSuccess(t *testing.T) {
	var gotBase, gotBody string
	render := func(_ context.Context, src io.Reader, baseName, workdir string) ([]string, error) {
		gotBase = baseName
		b, _ := io.ReadAll(src)
		gotBody = string(b)
		out := filepath.Join(workdir, baseName+".pdf")
		if err := os.WriteFile(out, []byte("%PDF-1.4 fake"), 0o644); err != nil {
			return nil, err
		}
		return []string{out}, nil
	}

	rr := postConvert(t, Handler(render),
		map[string]string{"base_name": "Gavotte", "format": "DS"},
		"file", "Gavotte", []byte("<drumscore/>"))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", rr.Code, rr.Body.String())
	}
	if gotBase != "Gavotte" {
		t.Fatalf("render got base_name %q, want Gavotte", gotBase)
	}
	if gotBody != "<drumscore/>" {
		t.Fatalf("render got body %q, want <drumscore/>", gotBody)
	}

	var resp convertResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp.Outputs) != 1 || resp.Outputs[0].Name != "Gavotte.pdf" {
		t.Fatalf("outputs = %+v, want one Gavotte.pdf", resp.Outputs)
	}
	data, err := base64.StdEncoding.DecodeString(resp.Outputs[0].ContentB64)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(data, []byte("%PDF-1.4")) {
		t.Fatalf("decoded output does not look like a PDF: %q", data)
	}
}

func TestConvertRenderErrorForwardsDetail(t *testing.T) {
	render := func(context.Context, io.Reader, string, string) ([]string, error) {
		return nil, &RenderError{Detail: "licence missing: nothing rendered"}
	}
	rr := postConvert(t, Handler(render),
		map[string]string{"base_name": "Gavotte"}, "file", "Gavotte", []byte("x"))

	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rr.Code)
	}
	body, _ := io.ReadAll(rr.Body)
	if !strings.Contains(string(body), "licence missing") {
		t.Fatalf("422 body should carry the render detail, got %q", body)
	}
}

func TestConvertNoOutputReturns422(t *testing.T) {
	render := func(context.Context, io.Reader, string, string) ([]string, error) { return nil, nil }
	rr := postConvert(t, Handler(render),
		map[string]string{"base_name": "Gavotte"}, "file", "Gavotte", []byte("x"))
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rr.Code)
	}
}

func TestConvertMissingBaseName(t *testing.T) {
	render := func(context.Context, io.Reader, string, string) ([]string, error) { return nil, nil }
	rr := postConvert(t, Handler(render), map[string]string{}, "file", "Gavotte", []byte("x"))
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rr.Code)
	}
}

func TestConvertMissingFile(t *testing.T) {
	render := func(context.Context, io.Reader, string, string) ([]string, error) { return nil, nil }
	rr := postConvert(t, Handler(render), map[string]string{"base_name": "Gavotte"}, "", "", nil)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rr.Code)
	}
}
