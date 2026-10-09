package main

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/maelgui/bagadmenru-v5/renderers/go/renderer"
)

// stubTool writes an executable shell script named `name` in a fresh dir and a
// passthrough `xvfb-run` beside it, puts that dir first on PATH, and returns the
// dir. The script body is the caller's; it mimics the real tool invocation.
func stubTool(t *testing.T, name, body string) {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, name), []byte("#!/bin/sh\n"+body), 0o755); err != nil {
		t.Fatal(err)
	}
	xvfb := "#!/bin/sh\nshift\nexec \"$@\"\n" // drop -a, exec the rest
	if err := os.WriteFile(filepath.Join(dir, "xvfb-run"), []byte(xvfb), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
}

func TestDrumScoreRenderSuccess(t *testing.T) {
	stubTool(t, "DrumScoreEditor", `
# args: createPDF <indir> <outdir>
for f in "$2"/*.ds; do
  base=$(basename "$f" .ds)
  printf '%%PDF-1.4 fake' > "$3/$base.pdf"
done
`)
	t.Setenv("DSE_BIN", "DrumScoreEditor")

	workdir := t.TempDir()
	paths, err := render(context.Background(), strings.NewReader("<drumscore/>"), "Gavotte", workdir)
	if err != nil {
		t.Fatalf("render error: %v", err)
	}
	if len(paths) != 1 || filepath.Base(paths[0]) != "Gavotte.pdf" {
		t.Fatalf("paths = %v, want one Gavotte.pdf", paths)
	}
	data, _ := os.ReadFile(paths[0])
	if !bytes.HasPrefix(data, []byte("%PDF-1.4")) {
		t.Fatalf("output not a PDF: %q", data)
	}
}

func TestDrumScoreNoOutputYieldsRenderError(t *testing.T) {
	stubTool(t, "DrumScoreEditor", `
echo "licence missing: nothing rendered" 1>&2
exit 0
`)
	t.Setenv("DSE_BIN", "DrumScoreEditor")

	workdir := t.TempDir()
	_, err := render(context.Background(), strings.NewReader("x"), "Gavotte", workdir)
	var re *renderer.RenderError
	if err == nil || !errorsAsRenderError(err, &re) {
		t.Fatalf("want RenderError, got %v", err)
	}
	if !strings.Contains(re.Detail, "licence missing") {
		t.Fatalf("detail = %q, want renderer stderr", re.Detail)
	}
}

func errorsAsRenderError(err error, target **renderer.RenderError) bool {
	re, ok := err.(*renderer.RenderError)
	if ok {
		*target = re
	}
	return ok
}
