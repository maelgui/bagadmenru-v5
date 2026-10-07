import os
import subprocess
from pathlib import Path

from fastapi import HTTPException

from contract import build_app

DSE_BIN = os.environ.get("DSE_BIN", "DrumScoreEditor")
DSE_TIMEOUT = int(os.environ.get("DSE_TIMEOUT", "110"))


def _render(source_bytes: bytes, base_name: str, workdir: Path) -> list[Path]:
    indir = workdir / "in"
    outdir = workdir / "out"
    indir.mkdir()
    outdir.mkdir()
    (indir / f"{base_name}.ds").write_bytes(source_bytes)

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


app = build_app("DrumScore renderer", _render)
