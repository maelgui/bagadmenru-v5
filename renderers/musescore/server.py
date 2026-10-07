import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile

app = FastAPI(title="MuseScore renderer")

MSCORE_BIN = os.environ.get("MSCORE_BIN", "mscore")
MSCORE_TIMEOUT = int(os.environ.get("MSCORE_TIMEOUT", "110"))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _run_job(src: Path, workdir: Path, base_name: str) -> list[Path]:
    conductor = workdir / f"{base_name}.pdf"
    part_prefix = str(workdir / f"{base_name} - ")
    job = [
        {
            "in": str(src),
            "out": [
                str(conductor),
                [part_prefix, " part.pdf"],
            ],
        }
    ]
    job_path = workdir / "job.json"
    job_path.write_text(json.dumps(job))

    result = subprocess.run(
        ["xvfb-run", "-a", MSCORE_BIN, "-F", "-j", str(job_path)],
        capture_output=True,
        timeout=MSCORE_TIMEOUT,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=422,
            detail=result.stderr.decode("utf-8", "replace")[:500] or "render failed",
        )
    return sorted(workdir.glob("*.pdf"))


@app.post("/convert")
async def convert(file: UploadFile, base_name: str = Form(...)) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        src = workdir / "source.mscz"
        src.write_bytes(await file.read())

        pdfs = _run_job(src, workdir, base_name)
        if not pdfs:
            raise HTTPException(status_code=422, detail="no PDF produced")

        return {
            "pdfs": [
                {
                    "name": p.name,
                    "content_b64": base64.b64encode(p.read_bytes()).decode("ascii"),
                }
                for p in pdfs
            ]
        }
