// Post-processes the generated typescript-fetch client to restore `Blob` typing
// for binary file uploads.
//
// FastAPI >= 0.116 (commit e8b98d2) describes `UploadFile` in the OpenAPI schema
// as `{"type": "string", "contentMediaType": "application/octet-stream"}` instead
// of the previous `{"type": "string", "format": "binary"}`. openapi-generator's
// typescript-fetch generator only recognises `format: binary` as a binary body,
// so with the new schema it emits `file: string` for multipart upload params —
// which breaks callers that pass a browser `File`/`Blob`.
//
// Until the generator understands `contentMediaType`, we rewrite the affected
// declarations back to `Blob`. This runs automatically after `generate-client`,
// so it survives regeneration. It is intentionally narrow: it only touches
// request-parameter interface members named `file` (and `files`) that the
// generator typed as `string` / `Array<string>`.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const apisDir = join(process.cwd(), 'lib', 'src', 'apis');

// Match a `file: string;` or `file?: string;` member (also `files: Array<string>`)
// inside a generated request-parameters interface. Anchored on the member name
// to avoid rewriting unrelated string fields.
const replacements = [
  { pattern: /(\n\s+files\??: )Array<string>(;)/g, to: '$1Array<Blob>$2' },
  { pattern: /(\n\s+file\??: )string(;)/g, to: '$1Blob$2' },
];

let patchedFiles = 0;
for (const name of readdirSync(apisDir)) {
  if (!name.endsWith('.ts')) continue;
  const path = join(apisDir, name);
  const original = readFileSync(path, 'utf8');
  let updated = original;
  for (const { pattern, to } of replacements) {
    updated = updated.replace(pattern, to);
  }
  if (updated !== original) {
    writeFileSync(path, updated);
    patchedFiles += 1;
    console.log(`fix-client-binary: patched ${name}`);
  }
}

console.log(`fix-client-binary: done (${patchedFiles} file(s) patched).`);
