import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import BackgroundTasks, Depends, UploadFile

from bbe2 import models
from bbe2.crud import CRUDFile
from bbe2.dependencies import SettingsDep, get_s3_helper
from bbe2.schemas import FileOrFolderUpdate
from bbe2.schemas.file import FileMove, FileOrFolderType
from bbe2.services.conversion import ConversionService, source_format_for
from bbe2.utils.s3 import S3Helper


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

        new_key = "files/" + str(uuid.uuid4())
        upload_size = file.size
        self.s3.upload_file(file.file, new_key, content_type=file.content_type)

        created = self.file_crud.create(
            type=FileOrFolderType.CONTAINER if src_format else FileOrFolderType.FILE,
            name=file.filename,
            file_key=new_key,
            parent_id=folder_id,
            source_format=src_format,
            processing_status="pending" if src_format else None,
            uploaded_by=user_id,
            size=upload_size,
        )

        if src_format:
            self._enqueue_generation(created.id, background_tasks)

        return created

    def rename_or_move(
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
        db_file = self.file_crud.update(db_file, update)
        db_file.modified_at = datetime.now(timezone.utc)
        db_file.modified_by = user_id
        self.file_crud.db_session.flush()
        self.file_crud.db_session.refresh(db_file)
        return db_file

    def move(
        self,
        file_id: int,
        move: FileMove,
        user_id: str,
    ) -> models.FileOrFolderDB:
        db_file = self.file_crud.find_one_by(models.FileOrFolderDB.id == file_id)
        if not db_file:
            raise FileNotFoundInStoreError()
        if db_file.parent_id is None:
            raise InvalidMoveTargetError()
        if self._parent_is_container(db_file):
            raise ContainerChildError()

        target = self.file_crud.find_one_by(
            models.FileOrFolderDB.id == move.target_parent_id
        )
        if not target:
            raise FileNotFoundInStoreError()
        if target.type != FileOrFolderType.DIRECTORY:
            raise InvalidMoveTargetError()

        if db_file.type == FileOrFolderType.DIRECTORY and self._is_descendant_or_self(
            target, db_file.id
        ):
            raise MoveCycleError()

        collision = self.file_crud.find_one_by(
            models.FileOrFolderDB.name == db_file.name,
            models.FileOrFolderDB.parent_id == target.id,
            models.FileOrFolderDB.id != db_file.id,
        )
        if collision:
            raise NameCollisionError()

        db_file.parent_id = target.id
        db_file.modified_at = datetime.now(timezone.utc)
        db_file.modified_by = user_id
        self.file_crud.db_session.flush()
        self.file_crud.db_session.refresh(db_file)
        return db_file

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
        old_key = existing.file_key
        new_key = "files/" + str(uuid.uuid4())
        upload_size = file.size
        self.s3.upload_file(file.file, new_key, content_type=file.content_type)

        existing.file_key = new_key
        existing.size = upload_size
        existing.modified_at = datetime.now(timezone.utc)
        existing.modified_by = user_id
        self.file_crud.db_session.flush()
        self.file_crud.db_session.refresh(existing)

        if old_key:
            self.s3.delete_object(old_key)
        return existing

    def _reupload_container(
        self,
        container: models.FileOrFolderDB,
        file: UploadFile,
        background_tasks: BackgroundTasks,
        user_id: str,
    ) -> models.FileOrFolderDB:
        new_key = "files/" + str(uuid.uuid4())
        upload_size = file.size
        self.s3.upload_file(file.file, new_key, content_type=file.content_type)

        old_keys = [child.file_key for child in container.children if child.file_key]
        if container.file_key:
            old_keys.append(container.file_key)
        for child in list(container.children):
            self.file_crud.delete(child.id)

        container.file_key = new_key
        container.size = upload_size
        container.processing_status = "pending"
        container.processing_failure_reason = None
        container.modified_at = datetime.now(timezone.utc)
        container.modified_by = user_id
        self.file_crud.db_session.commit()
        self.file_crud.db_session.refresh(container)

        for key in old_keys:
            self.s3.delete_object(key)

        self._enqueue_generation(container.id, background_tasks)
        return container

    def _enqueue_generation(
        self,
        container_id: int,
        background_tasks: BackgroundTasks,
    ) -> None:
        service = ConversionService(self.settings, self.s3)
        background_tasks.add_task(service.generate, container_id)

    def _delete_node_s3(self, node: models.FileOrFolderDB) -> None:
        if node.type == FileOrFolderType.CONTAINER:
            for child in node.children:
                if child.file_key:
                    self.s3.delete_object(child.file_key)
            if node.file_key:
                self.s3.delete_object(node.file_key)
        elif node.type == FileOrFolderType.FILE and node.file_key:
            self.s3.delete_object(node.file_key)

    def _parent_is_container(self, node: models.FileOrFolderDB) -> bool:
        if node.parent_id is None:
            return False
        parent = self.file_crud.find_one_by(models.FileOrFolderDB.id == node.parent_id)
        return parent is not None and parent.type == FileOrFolderType.CONTAINER


FileServiceDep = Annotated[FileService, Depends(FileService)]
