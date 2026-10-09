import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { E2E_ADMIN } from './helpers/constants';

const FIXTURES_DIR = join(__dirname, 'fixtures');

// Real conversion runs MuseScore/DrumScore on the deployed renderers; give the
// async pipeline room on a loaded beta runner.
const CONVERSION_TIMEOUT_MS = 120_000;

interface RendererCase {
  label: string;
  fixture: string;
  mimeType: string;
}

const CASES: RendererCase[] = [
  { label: 'MuseScore (.mscz)', fixture: 'sample.mscz', mimeType: 'application/octet-stream' },
  { label: 'DrumScore (.ds)', fixture: 'sample.ds', mimeType: 'application/octet-stream' },
];

test.describe('Score renderers', () => {
  for (const { label, fixture, mimeType } of CASES) {
    test(`${label}: upload generates a PDF through the deployed renderer`, async ({ page }) => {
      // The whole flow waits on a real MuseScore/DrumScore conversion, so the
      // test needs more than Playwright's 30s default to reach the PDF.
      test.setTimeout(CONVERSION_TIMEOUT_MS + 30_000);

      await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

      await page.goto('/files');
      await page.waitForLoadState('networkidle');

      // Unique name per run so re-runs never collide on an existing container.
      const extension = fixture.split('.').pop();
      const uploadName = `e2e-renderer-${Date.now()}.${extension}`;

      // Drive the real file picker so the request goes through the generated
      // client (multipart FormData), exactly as a user upload would — not a
      // fabricated API request.
      await page.setInputFiles('input[type="file"]', {
        name: uploadName,
        mimeType,
        buffer: readFileSync(join(FIXTURES_DIR, fixture)),
      });

      await expect(
        page.getByText(/fichier\(s\) envoyé\(s\) avec succès/i),
      ).toBeVisible({ timeout: 15_000 });

      // The upload creates a CONTAINER keeping the source file's name. Open it
      // to watch the async conversion.
      const container = page.getByRole('link', { name: uploadName });
      await expect(container).toBeVisible();
      await container.click();

      await page.waitForURL(/\/files\/\d+/);

      // The container page polls the async conversion. It resolves to exactly
      // one of two terminal states: the read-only alert (success) or the
      // failure alert. Race them so a real failure fails the test immediately
      // with a clear message instead of waiting out the full timeout.
      const readyAlert = page.getByText('Dossier en lecture seule');
      const failedAlert = page.getByText('La conversion a échoué');
      await expect(readyAlert.or(failedAlert).first()).toBeVisible({
        timeout: CONVERSION_TIMEOUT_MS,
      });
      await expect(
        failedAlert,
        'the renderer reported a conversion failure',
      ).toBeHidden();

      // Success confirmed: the generated PDF shows up as a child of the container.
      await expect(
        page.getByRole('link', { name: /\.pdf$/ }).first(),
      ).toBeVisible({ timeout: CONVERSION_TIMEOUT_MS });
    });
  }
});
