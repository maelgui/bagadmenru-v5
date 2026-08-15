# Filesystem Implementation Review

## Critical Issues

### 1. S3 object leak on folder delete

When deleting a folder, the DB cascade (`ondelete="cascade"`) removes child rows, but S3 objects for files inside that folder are never deleted — they become orphaned blobs.

```python
# In delete_file: only deletes the immediate file's S3 object
if db_file.type == FileOrFolderType.FILE:
    s3.delete_object(db_file.file_key)
file_crud.delete(file_id)
# Children files' S3 objects are leaked
```

**Fix:** Before deleting a folder, recursively collect all descendant files' `file_key` values and delete them from S3.

### 2. No validation that `parent_id` points to a folder

Both `upload_file` and `create_folder` accept any `folder_id` without checking that it's actually a `DIRECTORY`. You could upload a file "inside" another file.

**Fix:** Add a check that the parent exists and is of type `DIRECTORY` before creating children.

### 3. Root folder race condition and duplicate creation

```python
root_file = file_crud.find_one_by(...)
if not root_file:
    root_file = file_crud.create(...)
```

Two concurrent requests can both pass the `if not root_file` check and create two root folders. The `UniqueConstraint("name", "parent_id")` doesn't help because PostgreSQL treats `NULL != NULL` in unique constraints — `(name="root", parent_id=NULL)` can be inserted multiple times.

**Fix:** Create the root folder in a migration or app startup. Reference it by a well-known ID or a dedicated `is_root` column. Add a partial unique index:

```sql
CREATE UNIQUE INDEX unique_root_entry ON files (name) WHERE parent_id IS NULL;
```

## Design Issues

### 4. `FileOrFolderUpdate` schema forces all fields on update

It inherits `name: str` (required) from `_FileOrFolderBase` and adds `parent_id: int` (required). You can't do a partial update (e.g. rename without moving).

**Fix:**
```python
class FileOrFolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
```

### 5. `ClassVar[S3Helper]` on the Pydantic schema is fragile

`FileOrFolder.s3_helper` is a class variable that must be set externally before serialization. If the dependency isn't injected (e.g. in a background task or test), it crashes with `AttributeError`. This is global mutable state.

**Fix:** Pass the S3 helper via a serialization context or compute the URL in the endpoint layer rather than in the schema.

### 6. Root created lazily on GET — side effect in a read endpoint

A GET request shouldn't create data. The root's `uploaded_at` timestamp becomes meaningless (it's whenever someone first hit the endpoint).

**Fix:** Create root in a migration so it always exists.

### 7. Root identification is fragile

The root is identified by `name == "root" AND parent_id IS NULL AND type == DIRECTORY`. Any entry matching these conditions would be returned as "the" root.

**Fix:** Use a well-known ID (e.g. `id=1`) or a dedicated boolean column.

## Minor Issues

### 8. `list_files` uses raw `session.query()` instead of the CRUD layer

Inconsistent with the rest of the endpoints which use `file_crud`.

### 9. Breadcrumb is O(n) queries

`get_breadcrumb` does one DB query per ancestor. For deep trees this is inefficient. A recursive CTE or materialized path would be better.

### 10. No size/content-type stored in the DB model

You rely entirely on S3 metadata for file information.

### 11. No max depth or max file count protection

Could create arbitrarily deep trees or unlimited files.

### 12. `UniqueConstraint("name", "parent_id")` doesn't prevent duplicates at root level

PostgreSQL treats `NULL != NULL` in unique constraints, so multiple entries with the same name and `parent_id=NULL` are allowed.

**Fix:** Add a partial unique index:
```python
Index("unique_root_entry", "name", unique=True, postgresql_where=parent_id.is_(None))
```
