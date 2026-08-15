# Requirements Document

## Introduction

The MSCZ-to-PDF Export feature adds automatic PDF generation for MuseScore (.mscz) files uploaded to the Bagad Men Ru file explorer. When a member uploads a .mscz file, the system automatically converts it to PDF using MuseScore and stores the resulting PDF alongside the original file. In the file explorer, .mscz files are presented as folders containing both the original .mscz file and the generated .pdf file. No user-facing customization options are provided for the PDF export.

This feature builds on the existing file explorer (FileOrFolderDB model, S3-backed storage) and introduces an asynchronous conversion pipeline that invokes MuseScore for the actual rendering.

## Glossary

- **MSCZ_File**: A MuseScore music notation file with the `.mscz` extension, uploaded by a member through the file explorer.
- **Generated_PDF**: A PDF file produced by converting an MSCZ_File via MuseScore. The Generated_PDF shares the same base name as the source MSCZ_File but uses a `.pdf` extension.
- **File_Explorer**: The existing frontend and backend components that allow authenticated users to browse, upload, and manage shared files and folders (backed by the FileOrFolderDB model and S3 storage).
- **Upload_API**: The backend endpoint responsible for receiving file uploads, storing them in S3, and creating metadata records in the database.
- **Conversion_Service**: The backend component responsible for invoking MuseScore to convert an MSCZ_File into a Generated_PDF and storing the result in S3.
- **MuseScore**: The external application used to render .mscz files into PDF format. Integration details (CLI invocation, containerized service, or API) are to be determined during design.
- **MSCZ_Folder**: A virtual folder displayed in the File_Explorer that groups an MSCZ_File together with its Generated_PDF under a single entry named after the original file (without extension).
- **Processing_Status**: The state of a background processing pipeline for a given file (pending, processing, completed, failed). Currently used for MSCZ-to-PDF conversion but designed to be generic for future processing needs.

## Requirements

### Requirement 1: Automatic PDF Conversion Trigger

**User Story:** As a member, I want the system to automatically generate a PDF when I upload a .mscz file, so that I can view the sheet music without needing MuseScore installed.

#### Acceptance Criteria

1. WHEN a member uploads a file with the `.mscz` extension through the Upload_API, THE Conversion_Service SHALL initiate a PDF conversion for that file and THE Upload_API SHALL return the upload response without waiting for the conversion to complete.
2. THE Conversion_Service SHALL invoke MuseScore to perform the conversion from .mscz to .pdf format.
3. IF the MuseScore process has not completed within 120 seconds (strict: processes reaching exactly 120 seconds SHALL be terminated), THEN THE Conversion_Service SHALL terminate the process and treat the conversion as failed.
4. WHEN the conversion completes successfully, THE Conversion_Service SHALL store the Generated_PDF in S3 with a key derived from the original MSCZ_File key.
5. WHEN the conversion completes successfully, THE Conversion_Service SHALL create a file metadata record in the database for the Generated_PDF linked to the source MSCZ_File.
6. IF the MuseScore conversion fails due to a non-zero exit code, a timeout, or an unreadable source file, THEN THE Conversion_Service SHALL update the Processing_Status to "failed" and SHALL NOT create a Generated_PDF record.
7. WHEN the Upload_API returns the response for an MSCZ_File upload, THE Upload_API SHALL include a generic processing status field in the response body indicating that background processing is pending.

### Requirement 2: PDF Naming Convention

**User Story:** As a member, I want the generated PDF to have the same name as my .mscz file (with a .pdf extension), so that I can easily identify which PDF corresponds to which score.

#### Acceptance Criteria

1. THE Conversion_Service SHALL name the Generated_PDF by replacing only the final `.mscz` extension of the source filename with `.pdf`, preserving all preceding characters including any additional dots.
2. WHEN the source MSCZ_File is named `my.score.v2.mscz`, THE Conversion_Service SHALL produce a Generated_PDF named `my.score.v2.pdf`.
3. THE Conversion_Service SHALL store the Generated_PDF S3 key by taking the full S3 key of the source MSCZ_File and replacing the trailing `.mscz` with `.pdf`, preserving the complete path prefix and base name.

### Requirement 3: MSCZ Folder Presentation

**User Story:** As a member, I want to see my .mscz file displayed as a folder in the file explorer containing both the original and the PDF, so that related files are grouped together.

#### Acceptance Criteria

1. WHEN an MSCZ_File has a corresponding Generated_PDF with Processing_Status "completed", THE File_Explorer SHALL display the MSCZ_File entry as an MSCZ_Folder in the same position where the MSCZ_File would normally appear.
2. THE MSCZ_Folder SHALL use the base name of the MSCZ_File (without the `.mscz` extension) as its display name.
3. WHEN a member opens an MSCZ_Folder, THE File_Explorer SHALL display both the original MSCZ_File and the Generated_PDF as children of that folder, with the MSCZ_File listed first and the Generated_PDF listed second.
4. IF an MSCZ_File does not have a Generated_PDF with Processing_Status "completed" (status is pending, processing, or failed), THEN THE File_Explorer SHALL display the MSCZ_File as a regular file entry (not as a folder), and the member SHALL still be able to download the original MSCZ_File during this time.
5. THE File_Explorer SHALL visually distinguish an MSCZ_Folder from regular folders so that the member can identify it as an auto-generated grouping rather than a user-created folder.

### Requirement 4: Conversion Status Tracking

**User Story:** As a member, I want to know the status of the PDF conversion, so that I understand whether the PDF is ready or if something went wrong.

#### Acceptance Criteria

1. WHEN a member uploads an MSCZ_File through the Upload_API, THE Upload_API SHALL set the Processing_Status to "pending" for that file.
2. WHEN the Conversion_Service begins processing an MSCZ_File, THE Conversion_Service SHALL update the Processing_Status to "processing".
3. WHEN the conversion completes successfully, THE Conversion_Service SHALL update the Processing_Status to "completed".
4. IF the conversion fails, THEN THE Conversion_Service SHALL update the Processing_Status to "failed" and store a failure reason describing the cause of the error.
5. IF the Processing_Status remains "processing" for longer than 120 seconds, THEN THE Conversion_Service SHALL update the Processing_Status to "failed" with a failure reason indicating a timeout.
6. THE File_Explorer SHALL display a status label indicating the current Processing_Status ("pending" or "processing") next to MSCZ_Files that have not yet completed conversion.
7. IF the Processing_Status is "failed", THEN THE File_Explorer SHALL display an indicator that the PDF generation failed along with the stored failure reason. The member can re-upload the file to trigger a new conversion.

### Requirement 5: Re-upload and Reconversion

**User Story:** As a member, I want the PDF to be regenerated when I re-upload an updated .mscz file, so that the PDF always reflects the latest version of the score.

#### Acceptance Criteria

1. WHEN a member uploads an MSCZ_File with the same name and in the same folder as an existing MSCZ_File, THE Upload_API SHALL replace the existing MSCZ_File in S3 and update the corresponding database metadata record with the new file version.
2. WHEN an existing MSCZ_File is replaced, THE Conversion_Service SHALL set the Processing_Status to "pending" and initiate a new PDF conversion for the updated file.
3. WHEN the new conversion completes successfully, THE Conversion_Service SHALL replace the previous Generated_PDF in S3 and update the Generated_PDF database metadata record with the new version.
4. WHILE the Processing_Status of a re-uploaded MSCZ_File is "pending" or "processing", THE File_Explorer SHALL continue to display the previous Generated_PDF.
5. IF the reconversion of a re-uploaded MSCZ_File fails, THEN THE Conversion_Service SHALL set the Processing_Status to "failed" and THE File_Explorer SHALL continue to display the previous Generated_PDF alongside a failure indicator.
6. IF a member re-uploads an MSCZ_File while a previous conversion is in "pending" or "processing" state, THEN THE Conversion_Service SHALL cancel or discard the in-progress conversion and initiate a new conversion for the latest uploaded file.

### Requirement 6: Deletion Behavior

**User Story:** As a member, I want the generated PDF to be deleted when I delete the original .mscz file, so that orphaned PDFs do not accumulate.

#### Acceptance Criteria

1. WHEN a member deletes an MSCZ_File that has a Processing_Status of "completed", THE Upload_API SHALL delete the corresponding Generated_PDF from S3 and delete the Generated_PDF metadata record from the database.
2. WHEN a member deletes an MSCZ_File that has a Processing_Status of "pending" or "processing", THE Upload_API SHALL mark the conversion as discarded so that the Conversion_Service does not store a Generated_PDF for that file, and SHALL delete the MSCZ_File metadata record and S3 object.
3. IF the S3 deletion of the Generated_PDF fails, THEN THE Upload_API SHALL still proceed with deleting the MSCZ_File metadata record and S3 object, and SHALL log the orphaned PDF for later cleanup.
4. IF a member attempts to delete a Generated_PDF independently from its source MSCZ_File, THEN THE Upload_API SHALL reject the request with a 403 forbidden error indicating that generated files cannot be deleted independently.
5. WHEN a member deletes an MSCZ_File that has a Processing_Status of "failed" or has no corresponding Generated_PDF, THE Upload_API SHALL delete only the MSCZ_File record and S3 object without attempting to delete a Generated_PDF.

### Requirement 7: No Customization Options

**User Story:** As a platform maintainer, I want the PDF export to use fixed default settings, so that the feature remains simple and consistent across all scores.

#### Acceptance Criteria

1. THE Conversion_Service SHALL invoke MuseScore without any custom formatting flags or configuration overrides, using only the built-in default export settings for all PDF conversions.
2. THE File_Explorer SHALL not display any configuration options for PDF export to the user.
3. IF the Upload_API receives any request parameters intended to control PDF export formatting or layout, THEN THE Upload_API SHALL ignore those parameters and SHALL explicitly fall back to the default MuseScore conversion settings.

### Requirement 8: Data Model Extension

**User Story:** As a developer, I want the file data model to support conversion tracking, so that the system can manage the relationship between .mscz files and their generated PDFs.

#### Acceptance Criteria

1. THE FileOrFolderDB model SHALL include an optional `processing_status` column of type String with allowed values: "pending", "processing", "completed", "failed", or null (for non-convertible files). The column SHALL default to null.
2. THE Generated_PDF record SHALL use the existing `parent_id` foreign key to reference the source MSCZ_File record. The existing `ondelete="cascade"` behavior SHALL automatically delete the Generated_PDF when the source MSCZ_File is deleted.
3. THE FileOrFolderDB model SHALL include an optional `processing_failure_reason` column of type String to store the cause of a failed conversion. The column SHALL default to null.
4. WHEN querying a file record whose parent record has `type = FILE` (indicating it is a generated file), THE Upload_API SHALL reject any PUT or DELETE request targeting that record with a 403 response indicating that generated files cannot be independently modified or deleted.
5. THE database migration SHALL add the new columns (`processing_status`, `processing_failure_reason`) as nullable with default null, preserving all existing file records without modification.
