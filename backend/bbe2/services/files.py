import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import BackgroundTasks, Depends, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from bbe2 import models
from bbe2.crud import CRUDFile
from bbe2.dependencies import SettingsDep, get_s3_helper
from bbe2.models.file_access import FileAccessDB
from bbe2.schemas import FileOrFolderUpdate
from bbe2.schemas.file import FileAccessAction, FileOrFolderType
from bbe2.services.conversion import ConversionService, source_format_for
from bbe2.utils.s3 import (
    FILE_URL_EXPIRATION_SECONDS,
    ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
    S3Helper,
)


class FileNotFoundInStoreError(Exception):
    pass


class FileAlreadyExistsError(Exception):
    pass


class ContainerUploadError(Exception):
    pass


class ContainerChildError(Exception):
    pass


class InvalidMoveTargetError(Exception):
    pass


class MoveCycleError(Exception):
    pass


class NameCollisionError(Exception):
    pass


class VersionPurgedError(Exception):
    pass


def _live_keys(node: models.FileOrFolderDB) -> list[str]:
    return [v.file_key for v in node.versions if v.purged_at is None]


def _versioned_name(name: str, number: int) -> str:
    stem, dot, extension = name.rpartition(".")
    if not dot:
        return f"{name} (v{number})"
    return f"{stem} (v{number}).{extension}"


def purge_superseded_versions(
    session: Session,
    s3: S3Helper,
    *,
    retention_days: int,
    now: Optional[datetime] = None,
) -> int:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=retention_days)
    versions = session.scalars(
        select(models.FileVersionDB).where(
            models.FileVersionDB.superseded_at < cutoff,
            models.FileVersionDB.purged_at.is_(None),
        )
    ).all()
    for version in versions:
        s3.delete_object(version.file_key)
        version.purged_at = now
    session.commit()
    return len(versions)


class FileService:
    def __init__(
        self,
        file_crud: Annotated[CRUDFile, Depends()],
        s3: Annotated[S3Helper, Depends(get_s3_helper)],
        settings: SettingsDep,
    ):
        self.file_crud = file_crud
        self.s3 = s3
        self.settings = settings

    def upload(
        self,
        folder_id: int,
        file: UploadFile,
        user_id: str,
        background_tasks: BackgroundTasks,
        *,
        force: bool,
    ) -> models.FileOrFolderDB:
        folder = self.file_crud.find_one_by(models.FileOrFolderDB.id == folder_id)
        if folder and folder.type == FileOrFolderType.CONTAINER:
            raise ContainerUploadError()

        src_format = source_format_for(file.filename or "", self.settings)

        existing = self.file_crud.find_one_by(
            models.FileOrFolderDB.name == file.filename,
            models.FileOrFolderDB.parent_id == folder_id,
        )

        if existing:
            if not force:
                raise FileAlreadyExistsError()
            if existing.type == FileOrFolderType.CONTAINER and src_format:
                return self._reupload_container(
                    existing, file, background_tasks, user_id
                )
            if existing.type == FileOrFolderType.FILE and not src_format:
                return self._reupload_file(existing, file, user_id)
            self._delete_node_s3(existing)
            self.file_crud.delete(existing.id)

        created = models.FileOrFolderDB(
            type=FileOrFolderType.CONTAINER if src_format else FileOrFolderType.FILE,
            name=file.filename,
            storage_id=str(uuid.uuid4()),
            parent_id=folder_id,
            source_format=src_format,
            processing_status="pending" if src_format else None,
            uploaded_by=user_id,
        )
        self.file_crud.db_session.add(created)
        self._store_new_version(created, file, user_id)

        if src_format:
            self._enqueue_generation(created.id, background_tasks)

        return created

    def update(
        self,
        file_id: int,
        update: FileOrFolderUpdate,
        user_id: str,
    ) -> models.FileOrFolderDB:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file:
            raise FileNotFoundInStoreError()
        if self._parent_is_container(db_file):
            raise ContainerChildError()

        if update.parent_id is not None:
            self._assert_valid_move_target(db_file, update.parent_id)

        name = update.name if update.name is not None else db_file.name
        parent_id = (
            update.parent_id if update.parent_id is not None else db_file.parent_id
        )
        self._assert_no_name_collision(name, parent_id, db_file.id)

        db_file.name = name
        db_file.parent_id = parent_id
        db_file.modified_at = datetime.now(timezone.utc)
        db_file.modified_by = user_id
        self.file_crud.db_session.flush()
        self.file_crud.db_session.refresh(db_file)
        return db_file

    def serve(
        self,
        file_id: int,
        user_id: str,
        action: FileAccessAction,
        disposition: str,
    ) -> str:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file or not db_file.current_version:
            raise FileNotFoundInStoreError()
        url = self._presigned_url(
            db_file.current_version.file_key, db_file.name, disposition
        )
        self.file_crud.db_session.add(
            FileAccessDB(file_id=file_id, user_id=user_id, action=action)
        )
        self.file_crud.db_session.commit()
        return url

    def list_versions(self, file_id: int) -> list[models.FileVersionDB]:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file:
            raise FileNotFoundInStoreError()
        return db_file.versions

    def serve_version(self, file_id: int, version_id: int) -> str:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file:
            raise FileNotFoundInStoreError()
        version = next((v for v in db_file.versions if v.id == version_id), None)
        if version is None:
            raise FileNotFoundInStoreError()
        if version.purged_at is not None:
            raise VersionPurgedError()
        return self._presigned_url(
            version.file_key,
            _versioned_name(db_file.name, version.number),
            "attachment",
        )

    def _presigned_url(self, key: str, filename: str, disposition: str) -> str:
        return self.s3.generate_get_presigned_url(
            object_name=key,
            filename=filename,
            disposition=disposition,
            cache_control=ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
            expiration=FILE_URL_EXPIRATION_SECONDS,
            stable=True,
        )

    def _assert_valid_move_target(
        self,
        db_file: models.FileOrFolderDB,
        target_id: int,
    ) -> None:
        if db_file.parent_id is None:
            raise InvalidMoveTargetError()
        target = self.file_crud.find_one_by(models.FileOrFolderDB.id == target_id)
        if not target:
            raise FileNotFoundInStoreError()
        if target.type != FileOrFolderType.DIRECTORY:
            raise InvalidMoveTargetError()
        if db_file.type == FileOrFolderType.DIRECTORY and self._is_descendant_or_self(
            target, db_file.id
        ):
            raise MoveCycleError()

    def _assert_no_name_collision(
        self,
        name: str,
        parent_id: int | None,
        exclude_id: int,
    ) -> None:
        collision = self.file_crud.find_one_by(
            models.FileOrFolderDB.name == name,
            models.FileOrFolderDB.parent_id == parent_id,
            models.FileOrFolderDB.id != exclude_id,
        )
        if collision:
            raise NameCollisionError()

    def _is_descendant_or_self(
        self,
        node: models.FileOrFolderDB,
        ancestor_id: int,
    ) -> bool:
        current: models.FileOrFolderDB | None = node
        while current is not None:
            if current.id == ancestor_id:
                return True
            current = (
                self.file_crud.find_one_by(
                    models.FileOrFolderDB.id == current.parent_id
                )
                if current.parent_id is not None
                else None
            )
        return False

    def delete(self, file_id: int) -> None:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file:
            raise FileNotFoundInStoreError()
        if self._parent_is_container(db_file):
            raise ContainerChildError()
        self._delete_node_s3(db_file)
        self.file_crud.delete(file_id)

    def _reupload_file(
        self,
        existing: models.FileOrFolderDB,
        file: UploadFile,
        user_id: str,
    ) -> models.FileOrFolderDB:
        existing.modified_at = datetime.now(timezone.utc)
        existing.modified_by = user_id
        self._store_new_version(existing, file, user_id)
        return existing

    def _reupload_container(
        self,
        container: models.FileOrFolderDB,
        file: UploadFile,
        background_tasks: BackgroundTasks,
        user_id: str,
    ) -> models.FileOrFolderDB:
        derived_keys = [
            key for child in container.children for key in _live_keys(child)
        ]
        for child in list(container.children):
            self.file_crud.db_session.delete(child)

        container.processing_status = "pending"
        container.processing_failure_reason = None
        container.modified_at = datetime.now(timezone.utc)
        container.modified_by = user_id
        self._store_new_version(container, file, user_id)

        for key in derived_keys:
            self.s3.delete_object(key)

        self._enqueue_generation(container.id, background_tasks)
        return container

    def _store_new_version(
        self,
        node: models.FileOrFolderDB,
        file: UploadFile,
        user_id: str,
    ) -> None:
        version = node.add_version(file.size, user_id)
        self.file_crud.db_session.flush()
        self.s3.upload_file(file.file, version.file_key, content_type=file.content_type)
        self.file_crud.db_session.commit()
        self.file_crud.db_session.refresh(node)

    def _enqueue_generation(
        self,
        container_id: int,
        background_tasks: BackgroundTasks,
    ) -> None:
        service = ConversionService(self.settings, self.s3)
        background_tasks.add_task(service.generate, container_id)

    def _delete_node_s3(self, node: models.FileOrFolderDB) -> None:
        nodes = (
            [node, *node.children]
            if node.type == FileOrFolderType.CONTAINER
            else [node]
        )
        for key in (key for n in nodes for key in _live_keys(n)):
            self.s3.delete_object(key)

    def _parent_is_container(self, node: models.FileOrFolderDB) -> bool:
        if node.parent_id is None:
            return False
        parent = self.file_crud.find_one_by(models.FileOrFolderDB.id == node.parent_id)
        return parent is not None and parent.type == FileOrFolderType.CONTAINER


FileServiceDep = Annotated[FileService, Depends(FileService)]
