import json
import os
import subprocess
from pathlib import Path

from fastapi import HTTPException

from contract import build_app

MSCORE_BIN = os.environ.get("MSCORE_BIN", "mscore")
MSCORE_TIMEOUT = int(os.environ.get("MSCORE_TIMEOUT", "110"))


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


app = build_app("MuseScore renderer", _render)
