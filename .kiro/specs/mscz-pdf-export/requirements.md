# Requirements Document

> **Delivery status (2026-10-05): `.ds` DrumScore support is deferred.**
> The initial delivery ships MuseScore (`.mscz`) only. The DrumScore spike
> (TBD-2) established that the Linux DrumScore Editor 3.6.6 `.deb` installs and
> that `DrumScoreEditor createPDF <in> <out>` is the correct command, but its
> batch export instantiates a Swing `JFrame`/`ScoreView` on the EDT and does not
> complete headless in a container (hangs after EULA acceptance). Until that is
> resolved, a `.ds` upload is treated as a plain FILE (no Container, no
> generation). The CONTAINER model and `source_format` column already accommodate
> `.ds` for the future reprise; only the renderer and the `ds` branch of
> `SUPPORTED_FORMATS` remain to be added. Requirements referencing `.ds` below
> describe the eventual target, not the current delivery.

## Introduction

The Score PDF Export feature adds automatic PDF generation for music notation files uploaded to the Bagad Men Ru file explorer. Two source formats are supported: MuseScore (`.mscz`) and DrumScore Editor (`.ds`). When a member uploads a source file, the system asynchronously renders it to one or more PDFs and groups the source together with its generated PDFs under a single read-only entry in the file explorer.

The generation rule depends on the source format:

- A `.mscz` file produces the **full score (conductor)** PDF plus **one PDF per instrument part** (1 → N PDFs).
- A `.ds` file produces a **single** PDF (no parts).

The grouping entry is a new file-system node type, the **Container**. A Container carries the uploaded source file itself and owns the generated PDFs as its children. The Container is read-only from the member's point of view: members cannot upload into it, create sub-folders in it, or delete/modify its children individually. Re-uploading a new version of the source cleans up all previously generated PDFs and regenerates them, while the Container (and therefore its identity, URL, and position in the tree) is preserved. In the UI the generated PDFs are the primary content; the original source remains downloadable through a secondary, de-emphasized action.

This feature builds on the existing file explorer (`FileOrFolderDB` model, S3-backed storage) and introduces an asynchronous conversion pipeline that invokes the appropriate external renderer per source format.

## Glossary

- **Source_File**: A music notation file uploaded by a member, in one of the supported source formats (`.mscz` or `.ds`).
- **Source_Format**: The format of a Source_File, one of: `mscz` (MuseScore), `ds` (DrumScore Editor). Determines which renderer is invoked and how many PDFs are produced.
- **Generated_PDF**: A PDF file produced by rendering a Source_File. A single Source_File may produce one or many Generated_PDFs.
- **Container**: A file-system node that carries a Source_File and owns its Generated_PDFs as children. A Container is a distinct node type alongside regular files and folders. It is read-only to members: no upload into it, no sub-folders, no independent child deletion or modification.
- **File_Explorer**: The existing frontend and backend components that let authenticated users browse, upload, and manage shared files and folders (backed by `FileOrFolderDB` and S3 storage).
- **Upload_API**: The backend endpoint responsible for receiving file uploads, storing them in S3, and creating metadata records in the database.
- **Conversion_Service**: The backend component responsible for invoking the appropriate renderer to convert a Source_File into its Generated_PDFs and storing the results in S3.
- **Renderer**: The external tool that renders a Source_File into PDF(s). MuseScore for `.mscz`, DrumScore Editor (or an equivalent CLI) for `.ds`. Integration details are TBD (see open questions).
- **Processing_Status**: The state of the background generation pipeline for a Container: pending, processing, completed, failed. Designed to be generic for future processing needs.
- **Node_Type**: The type of a `FileOrFolderDB` record, one of: `DIR` (user folder), `FILE` (regular file), `CONTAINER` (source + generated PDFs grouping).
- **Authenticated_User**: Any user who has successfully authenticated with the platform.

## Open Questions (TBD)

These are unresolved technical unknowns that must be settled during design/spike before the corresponding requirements can be finalized. Requirements that depend on them are marked **[TBD]**.

- **TBD-1 — MuseScore parts export.** The exact MuseScore 4 CLI/command that exports the full score plus one PDF per instrument part, the resulting file set, and how each part PDF is named (source of the instrument/part name). Until resolved, the per-part naming convention (Requirement 2) and the exact number of Generated_PDFs for a `.mscz` are provisional.
- **TBD-2 — DrumScore Editor conversion. [DEFERRED]** Spike result: the Linux DrumScore Editor 3.6.6 `.deb` (app Java, binary `/opt/drumscoreeditor/bin/DrumScoreEditor`) installs and runs headless, and `DrumScoreEditor createPDF <in.ds> <out.pdf>` is the documented command. Batch export requires prior EULA acceptance (stored in `java.util.prefs`, node `org/whiteware/DrumScoreEditor/Legal`, key `EULAAccepted`); without it the command no-ops silently. After accepting the EULA the command still hangs headless because the export builds a real Swing `JFrame` + `ScoreView` via `invokeAndWait` and never completes/exits in the container. `.ds` support is therefore deferred until a reliable headless path is found (correct Xvfb+fonts combo, or an upstream batch mode that does not open a window). Not a blocker for the `.mscz` delivery.
- **TBD-3 — Conversion timeout.** The timeout budget per generation. The previous spec used 120s for a single PDF; multi-part MuseScore exports may need a larger budget. Provisional value: 120s, to be revised after TBD-1.
- **TBD-4 — Part naming collisions.** Whether two parts can yield the same derived filename (e.g. duplicated instrument names) and the disambiguation rule. Depends on TBD-1.

## Requirements

### Requirement 1: Automatic Generation Trigger

**User Story:** As a member, I want the system to automatically generate PDFs when I upload a score source file, so that I and others can read the sheet music without the authoring software.

#### Acceptance Criteria

1. WHEN a member uploads a file whose extension is a supported Source_Format (`.mscz` or `.ds`, case-insensitive) through the Upload_API, THE Upload_API SHALL create a Container carrying that Source_File, initiate asynchronous generation, and return the upload response without waiting for the generation to complete.
2. WHEN a member uploads a file whose extension is not a supported Source_Format, THE Upload_API SHALL create a regular FILE record as it does today, with no generation and no Container.
3. THE Conversion_Service SHALL invoke the Renderer corresponding to the Container's Source_Format.
4. **[TBD-1, TBD-2]** WHEN the Source_Format is `mscz`, THE Conversion_Service SHALL produce the full-score (conductor) PDF plus one PDF per instrument part. WHEN the Source_Format is `ds`, THE Conversion_Service SHALL produce exactly one PDF.
5. **[TBD-3]** IF a Renderer process has not completed within the configured timeout, THEN THE Conversion_Service SHALL terminate it and treat the generation as failed.
6. WHEN generation completes successfully, THE Conversion_Service SHALL store each Generated_PDF in S3 and create a FILE record for it as a child of the Container.
7. IF generation fails (non-zero exit, timeout, unreadable source, or renderer unavailable), THEN THE Conversion_Service SHALL set the Container's Processing_Status to "failed" with a failure reason and SHALL NOT create partial Generated_PDF children.
8. WHEN the Upload_API returns the response for a Source_File upload, THE response SHALL include the Container's Processing_Status indicating that background processing is pending.

### Requirement 2: PDF Naming Convention

**User Story:** As a member, I want generated PDFs named clearly after the score and the part, so that I can identify which PDF is which.

#### Acceptance Criteria

1. THE Conversion_Service SHALL base every Generated_PDF name on the Source_File base name (the filename without its source extension).
2. WHEN the Source_Format is `ds`, THE single Generated_PDF SHALL be named `<base>.pdf`.
3. **[TBD-1]** WHEN the Source_Format is `mscz`, THE full-score Generated_PDF SHALL be named after the base name and each part PDF SHALL incorporate the part/instrument name. The exact pattern (e.g. `<base> - <part>.pdf`) and the source of the part name are provisional pending TBD-1.
4. **[TBD-4]** IF two Generated_PDFs for the same Container would resolve to the same name, THEN THE Conversion_Service SHALL disambiguate them deterministically. The disambiguation rule is provisional pending TBD-4.
5. THE Conversion_Service SHALL derive each Generated_PDF S3 key independently of its display name (opaque key), so that naming changes do not require re-keying stored objects.

### Requirement 3: Container Presentation

**User Story:** As a member, I want a source file and its generated PDFs grouped as a single read-only entry, with the PDFs shown first and the source available but discreet.

#### Acceptance Criteria

1. THE File_Explorer SHALL display a Container as a single entry in the folder where the source was uploaded, named after the source base name (without the source extension).
2. THE File_Explorer SHALL visually distinguish a Container from a regular user folder (DIR), so that members recognize it as an auto-generated grouping.
3. WHEN a member opens a Container, THE File_Explorer SHALL display its Generated_PDFs as the primary content.
4. THE File_Explorer SHALL expose the original Source_File through a secondary, de-emphasized action (e.g. a discreet "source" download), not as a primary list item alongside the PDFs.
5. WHILE a Container's Processing_Status is "pending" or "processing", THE File_Explorer SHALL display a status indicator and the Source_File SHALL remain downloadable through the secondary action.
6. IF a Container's Processing_Status is "failed", THEN THE File_Explorer SHALL display a failure indicator with the stored failure reason, and the member can re-upload the source to retrigger generation.

### Requirement 4: Generation Status Tracking

**User Story:** As a member, I want to know the generation status, so that I understand whether the PDFs are ready or something failed.

#### Acceptance Criteria

1. WHEN a Container is created on upload, THE Upload_API SHALL set its Processing_Status to "pending".
2. WHEN the Conversion_Service begins processing a Container, THE Conversion_Service SHALL set its Processing_Status to "processing".
3. WHEN generation completes successfully, THE Conversion_Service SHALL set the Processing_Status to "completed".
4. IF generation fails, THEN THE Conversion_Service SHALL set the Processing_Status to "failed" and store a failure reason describing the cause.
5. **[TBD-3]** IF the Processing_Status remains "processing" beyond the configured timeout, THEN THE Conversion_Service SHALL set it to "failed" with a timeout failure reason.

### Requirement 5: Re-upload Cleans Up and Regenerates

**User Story:** As a member, I want re-uploading an updated source to cleanly replace everything, so that the PDFs always reflect the latest version with no stale leftovers.

#### Acceptance Criteria

1. WHEN a member uploads a Source_File whose base name and parent folder match an existing Container, THE Upload_API SHALL treat it as a re-upload of that Container rather than creating a second Container.
2. WHEN a re-upload occurs, THE Upload_API SHALL replace the Container's stored source in S3, delete all existing Generated_PDF children (database records and S3 objects), set the Processing_Status to "pending", and initiate a new generation.
3. THE Upload_API SHALL preserve the Container's identity (database id, position in the tree, and URL) across a re-upload.
4. WHEN the new generation completes, THE Conversion_Service SHALL create the fresh set of Generated_PDF children for the Container.
5. IF a member re-uploads while a previous generation is still "pending" or "processing", THEN THE Conversion_Service SHALL discard the in-progress generation's output and only the latest generation's PDFs SHALL be stored.

### Requirement 6: Deletion Behavior

**User Story:** As a member, I want deleting a Container to remove the source and all its PDFs together, so that nothing is orphaned.

#### Acceptance Criteria

1. WHEN a member deletes a Container, THE Upload_API SHALL delete the Container's source S3 object, all Generated_PDF S3 objects, and all associated database records (children via cascade).
2. IF the S3 deletion of any Generated_PDF or the source fails, THEN THE Upload_API SHALL still delete the database records and SHALL log the orphaned S3 key(s) for later cleanup.
3. IF a member attempts to delete or modify a Generated_PDF child of a Container individually, THEN THE Upload_API SHALL reject the request with a 403 forbidden error indicating that container contents cannot be modified independently.
4. WHEN a member deletes a Container whose Processing_Status is "pending" or "processing", THE Upload_API SHALL mark the in-progress generation as discarded so the Conversion_Service does not store its output, then delete the Container.

### Requirement 7: Container Is Read-Only and Closed

**User Story:** As a member, I want a Container to behave as a closed read-only group, so that its contents stay exactly what the system generated.

#### Acceptance Criteria

1. IF a member attempts to upload a file into a Container (as if it were a folder), THEN THE Upload_API SHALL reject the request with a 403 forbidden error.
2. IF a member attempts to create a sub-folder inside a Container, THEN THE Upload_API SHALL reject the request with a 403 forbidden error.
3. IF a member attempts to PUT (rename/move) or DELETE a child of a Container, THEN THE Upload_API SHALL reject the request with a 403 forbidden error (as in Requirement 6.3).
4. THE Upload_API SHALL allow a Container itself to be deleted (Requirement 6) and SHALL NOT allow a Container to be converted into or treated as a user DIR.

### Requirement 8: No Customization Options

**User Story:** As a platform maintainer, I want generation to use fixed defaults, so that the feature stays simple and consistent.

#### Acceptance Criteria

1. THE Conversion_Service SHALL invoke each Renderer with only its built-in default export settings, with no user-facing formatting flags.
2. THE File_Explorer SHALL not display any PDF-export configuration options to the member.
3. IF the Upload_API receives request parameters intended to control export formatting, THEN THE Upload_API SHALL ignore them and fall back to the default renderer settings.

### Requirement 9: Data Model Extension

**User Story:** As a developer, I want the file data model to represent Containers and track generation, so that the system manages sources and their PDFs reliably.

#### Acceptance Criteria

1. THE Node_Type SHALL be extended with a third value `CONTAINER`, alongside the existing `DIR` and `FILE`.
2. THE `FileOrFolderDB` model SHALL allow a `CONTAINER` record to carry the uploaded source via the existing `file_key` field (the Container is the source's node), and SHALL own Generated_PDF `FILE` records as children via the existing `parent_id` relationship.
3. THE `FileOrFolderDB` model SHALL include an optional `source_format` column (allowed values `mscz`, `ds`, or null for non-container records) to route regeneration to the correct Renderer.
4. THE `FileOrFolderDB` model SHALL include an optional `processing_status` column (allowed values `pending`, `processing`, `completed`, `failed`, or null for non-container records), defaulting to null.
5. THE `FileOrFolderDB` model SHALL include an optional `processing_failure_reason` column (string) to store the cause of a failed generation, defaulting to null.
6. THE existing `ondelete="cascade"` on `parent_id` SHALL automatically delete Generated_PDF records when their Container is deleted.
7. THE database migration SHALL add the new columns as nullable with default null, preserving all existing records without modification.
8. A record is a Container's content IF AND ONLY IF its parent record's Node_Type is `CONTAINER`; read-only enforcement (Requirements 6.3, 7.1–7.3) SHALL be derived from the parent's Node_Type, with no additional per-child flag or parallel hierarchy.

### Requirement 10: Authorization and Existing Permissions

**User Story:** As a platform administrator, I want Container operations to respect the existing file permission model, so that access control is consistent.

#### Acceptance Criteria

1. THE Upload_API SHALL apply the existing file resource authorization (VIEW/CREATE/EDIT/DELETE on the FILE resource) to Container creation, viewing, and deletion.
2. IF an unauthenticated request is made to any Container-related endpoint, THEN THE Upload_API SHALL return a 401 unauthorized error.
3. THE feature SHALL NOT introduce new roles or permissions beyond the existing file resource permissions.
