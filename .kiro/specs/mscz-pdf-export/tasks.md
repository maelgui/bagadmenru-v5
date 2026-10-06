# Implementation Plan: Score PDF Export

## Overview

Build automatic PDF generation for uploaded score sources (`.mscz` MuseScore, `.ds` DrumScore Editor). The source becomes a `CONTAINER` node carrying the source file and owning its generated PDFs as read-only children. Generation runs asynchronously via FastAPI `BackgroundTasks` against a renderer sidecar per format. Re-upload cleans up and regenerates; the frontend shows the PDFs first and the source as a discreet secondary download.

Backend: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, pytest + Hypothesis. Frontend: React 19, TypeScript, React Query. Renderers: MuseScore 4 (`-j job.json`, parts via output tuple) and DrumScore Editor (`createPDF <in> <out>`), each as an HTTP sidecar.

Design decisions and the resolved spike (TBD-1 MuseScore parts, TBD-2 DrumScore CLI) live in `design.md`. The two remaining TBDs are non-blocking: TBD-3 (timeout, measure on a real multi-part score), TBD-4 (part-name collision).

## Phasing

- Phase 1 — type-usage audit (prerequisite to introducing `CONTAINER`)
- Phase 2 — model, migration, read-only endpoints, delete cascade (no renderer)
- Phase 3 — MuseScore generation
- Phase 4 — DrumScore generation
- Phase 5 — frontend presentation

## Tasks

### Phase 1 — Type-usage audit

- [ ] 1. Enumerate and classify every `FileOrFolderType` / node-`type` usage, back and front
  - Audit result (from code search, to verify as code changes):
    - Backend: `bbe2/schemas/file.py` (enum def + schema field), `bbe2/models/file.py` (mapped column), `bbe2/api/v1/endpoints/files.py` (list `t` filter; `get_root` DIRECTORY lookup/create; `create_folder` DIRECTORY create; `delete_file` FILE→S3 branch)
    - Frontend: `pages/files/components/file-item.tsx` (icon, download link, navigation on `Dir`/`File`), `pages/files/list.tsx` (split folders vs files), `pages/home/home.tsx` (latest files `t: File`), plus `file-item.test.tsx` / `list` tests
  - For each site, decide the `CONTAINER` behavior explicitly (treated as folder-like for navigation, file-like for download of the source, excluded/included in which listings)
  - Confirm the DB storage representation of the enum tolerates a new value without a destructive migration
  - _Requirements: 9.1, 9.8_

### Phase 2 — Model, migration, read-only endpoints (no renderer)

- [ ] 2. Extend the node type and data model
  - [ ] 2.1 Add `CONTAINER` to `FileOrFolderType` and the tracking columns to `FileOrFolderDB`
    - `bbe2/schemas/file.py`: add `CONTAINER = "CONTAINER"` to the enum
    - `bbe2/models/file.py`: add nullable `source_format` (String 8), `processing_status` (String 16), `processing_failure_reason` (String 512), all default None
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ] 2.2 Alembic migration adding the three nullable columns
    - `upgrade`: add `source_format`, `processing_status`, `processing_failure_reason` as nullable/default null; `downgrade`: drop them
    - No change to existing rows; no enum DB constraint change (per Phase 1 confirmation)
    - _Requirements: 9.7_
  - [ ] 2.3 Expose the new fields in the `FileOrFolder` schema
    - `bbe2/schemas/file.py`: add `source_format`, `processing_status`, `processing_failure_reason`; for a CONTAINER, `fileUrl`/`downloadUrl` resolve to the source `file_key` (secondary action)
    - _Requirements: 3.4, 4.x_

- [ ] 3. Read-only container enforcement and listing semantics
  - [ ] 3.1 Reject writes into a CONTAINER
    - `upload_file`: 403 when `folder_id` is a CONTAINER (Req 7.1)
    - `create_folder`: 403 when parent is a CONTAINER (Req 7.2)
    - _Requirements: 7.1, 7.2_
  - [ ] 3.2 Reject individual modification/deletion of container children
    - `update_file` / `delete_file`: 403 when the target's parent is a CONTAINER (Req 6.3, 7.3), derived solely from `parent.type == CONTAINER` (Req 9.8)
    - _Requirements: 6.3, 7.3, 9.8_
  - [ ] 3.3 List children of a CONTAINER as its PDFs; keep generated PDFs out of the parent folder listing
    - `list_children`: a CONTAINER returns its PDF children; the source is not a child (it is the CONTAINER's own `file_key`)
    - _Requirements: 3.1, 3.3_

- [ ] 4. Delete cascade with explicit S3 cleanup
  - [ ] 4.1 Delete a CONTAINER removes source + all child PDF S3 objects and all rows
    - `delete_file` for a CONTAINER: collect the source `file_key` and every child `file_key`, delete each from S3, then delete the DB row (children cascade). On S3 failure, log the orphaned key and proceed (fixes the known orphaned-blob bug; Req 6.1, 6.2)
    - _Requirements: 6.1, 6.2_

- [ ] 5. Checkpoint — model + endpoints (no renderer)
  - Property tests (pytest + Hypothesis, 100 iters, tag `# Feature: score-pdf-export, Property N`):
    - Property 1 (status/type on supported vs unsupported extension — upload sets CONTAINER+pending vs plain FILE)
    - Property 2 (container content ⟺ parent is CONTAINER)
    - Property 3 (403 gates: upload-into / create-folder / update-child / delete-child vs the same on a DIR)
    - Property 4 (delete cascade removes all S3 objects + rows, mock S3)
  - Ensure the suite passes; ask the user if questions arise

### Phase 3 — MuseScore generation

- [ ] 6. Conversion service and MuseScore sidecar
  - [ ] 6.1 `ConversionService` skeleton (`bbe2/services/conversion.py`)
    - `generate(container_id)`: status processing → download source → `_render` → upload each PDF (opaque key) → create one FILE child per PDF → status completed; on failure, status failed + reason, no partial children; re-check not-discarded/not-superseded before writing (Req 5.5, 6.4)
    - `_render(source_bytes, "mscz", base)`: POST to the MuseScore sidecar, return `[(name, bytes), ...]`
    - _Requirements: 1.3, 1.6, 1.7, 4.2, 4.3, 4.4_
  - [ ] 6.2 MuseScore HTTP sidecar (Docker) + compose/K8s wiring
    - Container runs `xvfb-run mscore -F -j job.json`; the job `out` lists the conductor PDF plus a part tuple → conductor + one PDF per part; `POST /convert` returns the PDF set (multi-PDF JSON response)
    - Add the sidecar to `docker-compose.yml` and the K8s pod; backend reads `MUSESCORE_URL`
    - _Requirements: 1.2, 1.4, 2.1, 2.3, 8.1_
  - [ ] 6.3 Wire upload to enqueue generation for `.mscz`
    - `upload_file`: detect `.mscz` → create CONTAINER (file_key=source, source_format=mscz, status=pending), enqueue `generate`; return with processing_status (Req 1.1, 1.8, 4.1)
    - _Requirements: 1.1, 1.8, 4.1_
  - [ ] 6.4 PDF naming for MuseScore
    - Conductor `<base>.pdf`; parts `<base> - <PartTitle> part.pdf` (from the job tuple); collision handling per TBD-4 (append index on duplicate title)
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [ ] 7. Re-upload cleanup + regenerate (MuseScore)
  - [ ] 7.1 Detect re-upload and replace content against a stable CONTAINER
    - Same base name + parent CONTAINER → replace source S3 object, delete existing PDF children (DB + S3), reset status pending, enqueue fresh generate; preserve CONTAINER id/URL (Req 5.1–5.4)
    - In-flight generation superseded by a re-upload discards its output (Req 5.5)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Checkpoint — MuseScore end to end
  - Property tests: Property 5 (re-upload preserves id, replaces children), Property 6 (extra formatting params ignored), Property 7 (mscz with K parts → 1+K PDFs — on real sidecar in integration, mocked `_render` at unit level)
  - Integration (CI, real sidecar): upload mscz → conductor + parts; re-upload replace; delete cascade with S3 verification
  - Measure a real multi-part export to set the timeout (resolves TBD-3)
  - Ensure the suite passes; ask the user if questions arise

### Phase 4 — DrumScore generation [DEFERRED]

> Deferred 2026-10-05. Spike done: Linux DrumScore Editor 3.6.6 `.deb` installs
> and runs headless; `DrumScoreEditor createPDF <in.ds> <out.pdf>` is the right
> command; batch export needs EULA acceptance (java prefs node
> `org/whiteware/DrumScoreEditor/Legal`, key `EULAAccepted`). After EULA, the
> command still hangs headless (export opens a Swing `JFrame`/`ScoreView` via
> `invokeAndWait` and never completes/exits in a container). Resume this phase
> once a reliable headless render path is found. Until then `.ds` is a plain FILE
> (`ds` is not in `SUPPORTED_FORMATS`).

- [ ] 9. DrumScore HTTP sidecar (Docker) [deferred]
  - Wraps `DrumScoreEditor createPDF <in.ds> <out.pdf>`; `POST /convert` returns the single PDF
  - Blocker to resolve first: headless export hangs (Swing window via invokeAndWait); needs a working Xvfb+fonts combo or an upstream non-GUI batch mode
  - Then add to compose/K8s; backend reads `DRUMSCORE_RENDERER_URL`; add `ds` to `SUPPORTED_FORMATS`; route `.ds` uploads through generation
  - _Requirements: 1.1, 1.3, 1.4, 2.2, 8.1_

### Phase 5 — Frontend presentation

- [ ] 11. Regenerate the API client
  - [ ] 11.1 `yarn generate-client && yarn build:lib` with the backend running; verify `CONTAINER`, `source_format`, `processing_status`, `processing_failure_reason` flow through
    - _Requirements: 3.x, 4.x_

- [ ] 12. CONTAINER presentation in the file explorer
  - [ ] 12.1 Render a CONTAINER as a distinct, openable entry
    - `pages/files/components/file-item.tsx`: add the CONTAINER case — distinct icon vs user folder (Req 3.2), opens like a folder, shows status/failure indicators (Req 3.5, 3.6, 4.6, 4.7)
    - `pages/files/list.tsx`: place CONTAINER among the openable entries (not in the flat files split)
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - [ ] 12.2 PDFs-first content with discreet source download
    - Inside a CONTAINER: list the PDF children as primary content; expose the source via a secondary, de-emphasized action on the container (Req 3.3, 3.4)
    - While pending/processing, keep the source downloadable and show a status label (Req 3.5)
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 13. Final checkpoint — full integration
  - E2E (Playwright): upload mscz → container with PDFs primary + discreet source; re-upload replaces PDFs; delete removes everything; failed generation shows the failure indicator
  - Ensure all suites pass; ask the user if questions arise

## Notes

- Property tests use Hypothesis, min 100 iterations, one test per property, tag `# Feature: score-pdf-export, Property N: <description>` (see design.md Correctness Properties)
- Draft/partial generation never leaves partial children; status failed carries a reason
- The delete S3 cascade is explicit code, not the FK cascade (which only covers DB rows) — this is the orphaned-blob fix flagged in the existing filesystem review
- `.ds` (Phase 4) is independent of the MuseScore path (Phase 3); either can ship first
- Container content read-only enforcement derives only from `parent.type == CONTAINER` — no per-child flag, no parallel hierarchy

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["5"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["8"] },
    { "id": 7, "tasks": ["9.1", "9.2"] },
    { "id": 8, "tasks": ["10"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["12.1", "12.2"] },
    { "id": 11, "tasks": ["13"] }
  ]
}
```
