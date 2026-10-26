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


def _renderer_urls(settings: Settings) -> dict[str, str]:
    """URL of the renderer backing each supported source format.

    A format is supported iff its renderer URL is configured; an unset URL
    disables that format. ``ds`` requires a licensed Drum Score Editor
    installation, so its URL is left unset until the licence's server use is
    cleared.
    """
    candidates = {
        "mscz": settings.musescore_renderer_url,
        "ds": settings.drumscore_renderer_url,
    }
    return {fmt: str(url) for fmt, url in candidates.items() if url}


CONTENT_TYPES = {
    "pdf": "application/pdf",
    "mp3": "audio/mpeg",
}
DEFAULT_CONTENT_TYPE = "application/octet-stream"


def content_type_for(name: str) -> str:
    extension = name.lower().rsplit(".", 1)
    if len(extension) != 2:
        return DEFAULT_CONTENT_TYPE
    return CONTENT_TYPES.get(extension[1], DEFAULT_CONTENT_TYPE)


def source_format_for(filename: str, settings: Settings) -> str | None:
    extension = filename.lower().rsplit(".", 1)
    if len(extension) != 2:
        return None
    return extension[1] if extension[1] in _renderer_urls(settings) else None


class RendererError(Exception):
    pass


def _disambiguated(outputs: list[tuple[str, bytes]]) -> list[tuple[str, bytes]]:
    seen: dict[str, int] = {}
    result = []
    for name, content in outputs:
        if name in seen:
            seen[name] += 1
            stem, dot, ext = name.rpartition(".")
            suffix = f" ({seen[name]})"
            name = f"{stem}{suffix}{dot}{ext}" if dot else f"{name}{suffix}"
        else:
            seen[name] = 0
        result.append((name, content))
    return result


class ConversionService:
    def __init__(self, settings: Settings, s3: S3Helper):
        self.settings = settings
        self.s3 = s3
        self.renderers = _renderer_urls(settings)
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
            source_version_id = container.current_version_id
            source_key = container.current_version.file_key
            source_format = container.source_format
            base_name = container.name.rsplit(".", 1)[0]

        source_bytes = self._download(source_key)
        outputs = self._render(source_bytes, source_format, base_name)

        with session_ctx(self.settings.database_url) as session:
            container = session.get(FileOrFolderDB, container_id, with_for_update=True)
            if (
                container is None
                or container.type != FileOrFolderType.CONTAINER
                or container.processing_status != STATUS_PROCESSING
                or container.current_version_id != source_version_id
            ):
                return
            derived: list[tuple[FileOrFolderDB, str, bytes]] = []
            for name, content in _disambiguated(outputs):
                node = FileOrFolderDB(
                    name=name,
                    type=FileOrFolderType.FILE,
                    storage_id=str(uuid.uuid4()),
                    parent_id=container_id,
                )
                version = node.add_version(size=len(content), uploaded_by=None)
                derived.append((node, version.file_key, content))
            session.add_all(node for node, _, _ in derived)
            session.flush()
            uploaded: list[str] = []
            try:
                for node, key, content in derived:
                    self.s3.upload_file(
                        io.BytesIO(content),
                        key,
                        content_type=content_type_for(node.name),
                    )
                    uploaded.append(key)
            except Exception:
                for key in uploaded:
                    self.s3.delete_object(key)
                raise
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
        outputs = payload.get("outputs", [])
        if not outputs:
            raise RendererError("Renderer returned no output")
        return [
            (item["name"], base64.b64decode(item["content_b64"])) for item in outputs
        ]
