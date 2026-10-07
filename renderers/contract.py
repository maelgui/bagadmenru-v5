"""Shared HTTP contract for the score renderer sidecars.

Each renderer (MuseScore, DrumScore, ...) runs a third-party tool with its own
binary, dependencies and invocation, but they all expose the same HTTP surface
to the backend: a health probe and a POST /convert that takes an uploaded
source file and returns the generated PDFs as base64.

This module owns that surface. A renderer provides only a ``render`` callable
that turns the source bytes into a list of PDF paths; everything HTTP-shaped
(request parsing, temp file handling, base64 response) lives here, identically
for every renderer.
"""

import base64
import tempfile
from pathlib import Path
from typing import Callable

from fastapi import FastAPI, Form, HTTPException, UploadFile

RenderFn = Callable[[bytes, str, Path], list[Path]]


def build_app(title: str, render: RenderFn) -> FastAPI:
    """FastAPI app implementing the renderer contract.

    ``render(source_bytes, base_name, workdir)`` must write the PDFs under
    ``workdir`` and return their paths; raising ``fastapi.HTTPException`` on a
    rendering failure surfaces the detail to the backend unchanged.
    """
    app = FastAPI(title=title)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.post("/convert")
    async def convert(file: UploadFile, base_name: str = Form(...)) -> dict:
        source_bytes = await file.read()
        with tempfile.TemporaryDirectory() as tmp:
            workdir = Path(tmp)
            pdfs = render(source_bytes, base_name, workdir)
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

    return app
