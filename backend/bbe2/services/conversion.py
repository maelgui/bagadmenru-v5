import base64
import io
import logging
import uuid

import httpx

from bbe2.config import Settings
from bbe2.database import session_ctx
from bbe2.models import FileOrFolderDB
from bbe2.schemas import FileOrFolderType
from bbe2.utils.s3 import S3Helper

logger = logging.getLogger(__name__)

STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"

SUPPORTED_FORMATS = {"mscz"}


def source_format_for(filename: str) -> str | None:
    extension = filename.lower().rsplit(".", 1)
    if len(extension) != 2:
        return None
    return extension[1] if extension[1] in SUPPORTED_FORMATS else None


class RendererError(Exception):
    pass


class ConversionService:
    def __init__(self, settings: Settings, s3: S3Helper):
        self.settings = settings
        self.s3 = s3
        self.renderers = {
            "mscz": settings.musescore_renderer_url,
        }
        self.timeout_seconds = (
            settings.score_render_timeout_seconds
            + settings.score_render_client_margin_seconds
        )

    def generate(self, container_id: int) -> None:
        try:
            self._run(container_id)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.exception("Score generation failed for container %s", container_id)
            self._mark_failed(container_id, str(exc))

    def _run(self, container_id: int) -> None:
        with session_ctx(self.settings.database_url) as session:
            container = session.get(FileOrFolderDB, container_id)
            if container is None or container.type != FileOrFolderType.CONTAINER:
                return
            container.processing_status = STATUS_PROCESSING
            container.processing_failure_reason = None
            session.commit()
            source_key = container.file_key
            source_format = container.source_format
            base_name = container.name.rsplit(".", 1)[0]

        source_bytes = self._download(source_key)
        pdfs = self._render(source_bytes, source_format, base_name)

        uploaded: list[tuple[str, str]] = []
        try:
            for display_name, pdf_bytes in pdfs:
                key = "files/" + str(uuid.uuid4())
                self.s3.upload_file(
                    io.BytesIO(pdf_bytes), key, content_type="application/pdf"
                )
                uploaded.append((display_name, key))
        except Exception:
            for _, key in uploaded:
                self.s3.delete_object(key)
            raise

        with session_ctx(self.settings.database_url) as session:
            container = session.get(FileOrFolderDB, container_id)
            if (
                container is None
                or container.type != FileOrFolderType.CONTAINER
                or container.processing_status != STATUS_PROCESSING
                or container.file_key != source_key
            ):
                for _, key in uploaded:
                    self.s3.delete_object(key)
                return
            seen: dict[str, int] = {}
            for display_name, key in uploaded:
                if display_name in seen:
                    seen[display_name] += 1
                    stem, dot, ext = display_name.rpartition(".")
                    suffix = f" ({seen[display_name]})"
                    display_name = (
                        f"{stem}{suffix}{dot}{ext}"
                        if dot
                        else f"{display_name}{suffix}"
                    )
                else:
                    seen[display_name] = 0
                session.add(
                    FileOrFolderDB(
                        name=display_name,
                        type=FileOrFolderType.FILE,
                        file_key=key,
                        parent_id=container_id,
                    )
                )
            container.processing_status = STATUS_COMPLETED
            container.processing_failure_reason = None
            session.commit()

    def _mark_failed(self, container_id: int, reason: str) -> None:
        try:
            with session_ctx(self.settings.database_url) as session:
                container = session.get(FileOrFolderDB, container_id)
                if container is None or container.type != FileOrFolderType.CONTAINER:
                    return
                if container.processing_status != STATUS_PROCESSING:
                    return
                container.processing_status = STATUS_FAILED
                container.processing_failure_reason = reason[:512]
                session.commit()
        except Exception:  # pylint: disable=broad-exception-caught
            logger.exception("Failed to record failure for container %s", container_id)

    def _download(self, source_key: str) -> bytes:
        buffer = io.BytesIO()
        self.s3.client.download_fileobj(self.s3.bucket_name, source_key, buffer)
        return buffer.getvalue()

    def _render(
        self, source_bytes: bytes, source_format: str, base_name: str
    ) -> list[tuple[str, bytes]]:
        url = self.renderers.get(source_format)
        if not url:
            raise RendererError(f"No renderer configured for {source_format}")
        try:
            response = httpx.post(
                str(url).rstrip("/") + "/convert",
                files={"file": (base_name, source_bytes)},
                data={"format": source_format, "base_name": base_name},
                timeout=self.timeout_seconds,
            )
        except httpx.TimeoutException as exc:
            raise RendererError("Rendering timed out") from exc
        except httpx.ConnectError as exc:
            raise RendererError("Renderer unavailable") from exc

        if response.status_code == 422:
            raise RendererError(response.text[:512] or "Invalid source file")
        if response.status_code >= 400:
            raise RendererError(f"Renderer error {response.status_code}")

        payload = response.json()
        pdfs = payload.get("pdfs", [])
        if not pdfs:
            raise RendererError("Renderer returned no PDF")
        return [(item["name"], base64.b64decode(item["content_b64"])) for item in pdfs]
