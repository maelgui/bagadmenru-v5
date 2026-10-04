// Post-processes the generated typescript-fetch client to restore `Blob` typing
// for binary file uploads.
//
// FastAPI >= 0.116 (commit e8b98d2) describes `UploadFile` in the OpenAPI schema
// as `{"type": "string", "contentMediaType": "application/octet-stream"}` instead
// of the previous `{"type": "string", "format": "binary"}`. openapi-generator's
// typescript-fetch generator only recognises `format: binary` as a binary body,
// so with the new schema it has two symptoms:
//
//   1. It types multipart `file` params as `string` instead of `Blob`.
//   2. It leaves `let useForm = false;` in the request body, so the method
//      builds the body with `URLSearchParams` instead of `FormData`. A browser
//      `File`/`Blob` appended to `URLSearchParams` is coerced to the string
//      "[object File]", and the backend rejects it with
//      "Expected UploadFile, received: <class 'str'>".
//
// Until the generator understands `contentMediaType`, we rewrite the affected
// declarations back to `Blob` and flip `useForm` to `true` in multipart
// methods. This runs automatically after `generate-client`, so it survives
// regeneration. It is intentionally narrow: it only touches request-parameter
// interface members named `file` (and `files`) that the generator typed as
// `string` / `Array<string>`, and only flips `useForm` inside a method whose
// `consumes` is `multipart/form-data`.

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

// Flip `let useForm = false;` to `true` only when a `multipart/form-data`
// `consumes` entry appears just above it, so the body is built with `FormData`.
// The generator emits the `consumes` array and the `useForm` declaration a few
// lines apart within the same method, with no other method boundary between
// them, so a bounded lookahead is safe and precise.
const useFormPattern =
  /(contentType: 'multipart\/form-data'[\s\S]{0,400}?let useForm = )false(;)/g;

let patchedFiles = 0;
for (const name of readdirSync(apisDir)) {
  if (!name.endsWith('.ts')) continue;
  const path = join(apisDir, name);
  const original = readFileSync(path, 'utf8');
  let updated = original;
  for (const { pattern, to } of replacements) {
    updated = updated.replace(pattern, to);
  }
  updated = updated.replace(useFormPattern, '$1true$2');
  if (updated !== original) {
    writeFileSync(path, updated);
    patchedFiles += 1;
    console.log(`fix-client-binary: patched ${name}`);
  }
}

console.log(`fix-client-binary: done (${patchedFiles} file(s) patched).`);
