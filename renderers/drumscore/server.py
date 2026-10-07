import base64
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile

app = FastAPI(title="DrumScore renderer")

DSE_BIN = os.environ.get("DSE_BIN", "DrumScoreEditor")
DSE_TIMEOUT = int(os.environ.get("DSE_TIMEOUT", "110"))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _run_job(indir: Path, outdir: Path) -> list[Path]:
    result = subprocess.run(
        ["xvfb-run", "-a", DSE_BIN, "createPDF", str(indir), str(outdir)],
        capture_output=True,
        timeout=DSE_TIMEOUT,
        check=False,
    )
    pdfs = sorted(outdir.glob("*.pdf"))
    if not pdfs:
        raise HTTPException(
            status_code=422,
            detail=result.stderr.decode("utf-8", "replace")[:500] or "render failed",
        )
    return pdfs


@app.post("/convert")
async def convert(file: UploadFile, base_name: str = Form(...)) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        indir = Path(tmp) / "in"
        outdir = Path(tmp) / "out"
        indir.mkdir()
        outdir.mkdir()
        (indir / f"{base_name}.ds").write_bytes(await file.read())

        pdfs = _run_job(indir, outdir)

        return {
            "pdfs": [
                {
                    "name": p.name,
                    "content_b64": base64.b64encode(p.read_bytes()).decode("ascii"),
                }
                for p in pdfs
            ]
        }
