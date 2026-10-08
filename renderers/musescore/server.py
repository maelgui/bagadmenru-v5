import json
import os
import subprocess
from pathlib import Path

from fastapi import HTTPException

from contract import build_app

MSCORE_BIN = os.environ.get("MSCORE_BIN", "mscore")
MSCORE_TIMEOUT = int(os.environ.get("MSCORE_TIMEOUT", "110"))


def _mscore(args: list[str], workdir: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["xvfb-run", "-a", MSCORE_BIN, "-F", *args],
        capture_output=True,
        timeout=MSCORE_TIMEOUT,
        check=False,
        cwd=workdir,
    )


def _render(source_bytes: bytes, base_name: str, workdir: Path) -> list[Path]:
    src = workdir / "source.mscz"
    src.write_bytes(source_bytes)

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

    pdf_result = _mscore(["-j", str(job_path)], workdir)
    if pdf_result.returncode != 0:
        raise HTTPException(
            status_code=422,
            detail=pdf_result.stderr.decode("utf-8", "replace")[:500]
            or "render failed",
        )

    conductor_mp3 = workdir / f"{base_name}.mp3"
    mp3_result = _mscore(["-o", str(conductor_mp3), str(src)], workdir)
    if mp3_result.returncode != 0:
        raise HTTPException(
            status_code=422,
            detail=mp3_result.stderr.decode("utf-8", "replace")[:500]
            or "audio render failed",
        )

    return sorted(p for p in workdir.iterdir() if p.suffix.lower() in {".pdf", ".mp3"})


app = build_app("MuseScore renderer", _render)
