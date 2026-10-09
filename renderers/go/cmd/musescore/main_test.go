package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// stubMscore installs a fake `mscore` that parses the batch job.json it is
// given (-j <path>) and expands outputs the way MuseScore does: a string output
// becomes that file; a [prefix, suffix] pair becomes one "<prefix>Flute<suffix>"
// file (a single fake part). It records each invocation's job.json into
// RECORD_DIR so the test can assert the PDF/MP3 split. A passthrough xvfb-run is
// placed beside it.
func stubMscore(t *testing.T, recordDir string) {
	t.Helper()
	dir := t.TempDir()
	body := `#!/bin/sh
# args: -F -j <jobpath>
jobpath=""
while [ $# -gt 0 ]; do
  case "$1" in
    -j) jobpath="$2"; shift 2;;
    *) shift;;
  esac
done
cp "$jobpath" "` + recordDir + `/job-$(ls ` + recordDir + ` | wc -l | tr -d ' ').json"
python3 - "$jobpath" <<'PY'
import json, sys
job = json.load(open(sys.argv[1]))
for entry in job:
    for out in entry["out"]:
        if isinstance(out, str):
            open(out, "wb").write(b"%PDF-1.4 fake" if out.endswith(".pdf") else b"ID3\x03fake")
        else:
            prefix, suffix = out
            path = prefix + "Flute" + suffix
            open(path, "wb").write(b"%PDF-1.4 part")
PY
`
	if err := os.WriteFile(filepath.Join(dir, "mscore"), []byte(body), 0o755); err != nil {
		t.Fatal(err)
	}
	xvfb := "#!/bin/sh\nshift\nexec \"$@\"\n"
	if err := os.WriteFile(filepath.Join(dir, "xvfb-run"), []byte(xvfb), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("MSCORE_BIN", "mscore")
}

func TestMuseScoreRenderSplitsPdfAndMp3(t *testing.T) {
	recordDir := t.TempDir()
	stubMscore(t, recordDir)

	workdir := t.TempDir()
	paths, err := render(context.Background(), strings.NewReader("fakemscz"), "AnDro", workdir)
	if err != nil {
		t.Fatalf("render error: %v", err)
	}

	names := make([]string, 0, len(paths))
	for _, p := range paths {
		names = append(names, filepath.Base(p))
	}
	sort.Strings(names)
	want := []string{"AnDro - Flute part.pdf", "AnDro.mp3", "AnDro.pdf"}
	if strings.Join(names, "|") != strings.Join(want, "|") {
		t.Fatalf("outputs = %v, want %v", names, want)
	}

	// Two separate MuseScore invocations: PDF+parts, then MP3 (the 4.x segfault
	// workaround). Assert each job.json carried only its own output kind.
	jobs, _ := filepath.Glob(filepath.Join(recordDir, "job-*.json"))
	if len(jobs) != 2 {
		t.Fatalf("expected 2 mscore invocations, got %d", len(jobs))
	}
	var sawPDFJob, sawMP3Job bool
	for _, jf := range jobs {
		raw, _ := os.ReadFile(jf)
		var parsed []struct {
			Out []json.RawMessage `json:"out"`
		}
		if err := json.Unmarshal(raw, &parsed); err != nil {
			t.Fatal(err)
		}
		s := string(raw)
		hasPDF := strings.Contains(s, ".pdf")
		hasMP3 := strings.Contains(s, ".mp3")
		if hasPDF && hasMP3 {
			t.Fatalf("a single job mixed PDF and MP3 (triggers the 4.x segfault): %s", s)
		}
		sawPDFJob = sawPDFJob || hasPDF
		sawMP3Job = sawMP3Job || hasMP3
	}
	if !sawPDFJob || !sawMP3Job {
		t.Fatalf("expected one PDF job and one MP3 job, pdf=%v mp3=%v", sawPDFJob, sawMP3Job)
	}
}
