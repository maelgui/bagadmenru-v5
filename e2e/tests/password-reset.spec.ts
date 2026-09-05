import { test, expect, request } from '@playwright/test';
import {
  waitForEmail,
  waitForEmailByCorrelationId,
  extractLinks,
  deleteAllEmails,
  deleteEmail,
  newCorrelationId,
} from './helpers/mailpit';
import { E2E_USER, API_URL, CORRELATION_ID_HEADER } from './helpers/constants';

test.describe('Password Reset Flow', () => {
  test.beforeEach(async () => {
    // Clear mailpit inbox before each test
    await deleteAllEmails();
  });

  test('should send password reset email and allow reset', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/auth/login');

    // Click "Mot de passe oublié" link
    await page.click('a[href*="reset"], a[href*="lost"]');
    await expect(page).toHaveURL(/\/(auth\/)?(reset|lost)/, { timeout: 5_000 });

    // 2. Fill email and submit the reset request
    await page.fill('input[type="email"], input[name="email"]', E2E_USER.email);
    await page.click('button[type="submit"]');

    // Should show a confirmation message (request accepted)
    await expect(
      page.getByText(/email.*envoyé|demande.*prise en compte/i)
    ).toBeVisible({ timeout: 5_000 });

    // 3. Wait for the email to arrive in mailpit
    const email = await waitForEmail(E2E_USER.email, {
      subject: 'mot de passe',
      timeout: 15_000,
    });

    expect(email.Subject.toLowerCase()).toContain('mot de passe');
    expect(email.To[0].Address).toBe(E2E_USER.email);

    // Clean up: delete the email after reading it
    await deleteEmail(email.ID);

    // 4. Extract the reset link from the email
    const links = extractLinks(email.HTML);
    const resetLink = links.find(
      (l) => l.includes('/auth/reset/') || l.includes('/auth/change')
    );

    expect(resetLink).toBeDefined();

    // 5. Visit the reset link (contains the token)
    if (resetLink) {
      await page.goto(resetLink);

      // 6. Fill in new password
      const passwordInputs = page.locator('input[type="password"]');
      const passwordInput = passwordInputs.first();
      await expect(passwordInput).toBeVisible({ timeout: 5_000 });
      await passwordInput.fill(E2E_USER.password); // Reset back to same password

      // Fill confirm password if there's a second field
      const confirmInput = passwordInputs.nth(1);
      if (await confirmInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmInput.fill(E2E_USER.password);
      }

      // Submit the new password
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(
        page.getByText('Mot de passe changé avec succès')
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should send reset email via API', async () => {
    // Test the API endpoint directly, correlating request → email by header.
    const ctx = await request.newContext({ baseURL: API_URL });
    const correlationId = newCorrelationId();
    const res = await ctx.post('/api/v1/auth/reset_password_request', {
      headers: { [CORRELATION_ID_HEADER]: correlationId },
      data: { email: E2E_USER.email },
    });

    // Should return 200/202/204 regardless of whether email exists
    // (to not reveal user existence)
    expect([200, 202, 204]).toContain(res.status());
    // The backend echoes the correlation ID back on the response.
    expect(res.headers()[CORRELATION_ID_HEADER.toLowerCase()]).toBe(correlationId);

    // Locate the exact email by its correlation header rather than subject.
    const email = await waitForEmailByCorrelationId(correlationId, {
      to: E2E_USER.email,
      timeout: 10_000,
    });

    expect(email).toBeDefined();
    expect(email.HTML).toContain('/auth/');

    // Clean up: delete the email after reading it
    await deleteEmail(email.ID);
    await ctx.dispose();
  });
});
