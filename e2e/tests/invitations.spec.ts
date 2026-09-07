import { test, expect } from '@playwright/test';
import {
  createInvitation,
  firstInstrumentName,
  deleteMemberByEmail,
  uniqueInviteEmail,
} from './helpers/invitations';
import {
  waitForEmail,
  deleteAllEmails,
  deleteEmail,
} from './helpers/mailpit';
import { VirtualAuthenticator } from './helpers/webauthn';

/**
 * Self-service invitation signup — both delivery flows.
 *
 * 1. EMAIL channel: the backend proves the address, so the OTP step is skipped
 *    and the account is created straight from the form.
 * 2. LINK channel: the address is unproven, so an emailed OTP must be entered
 *    before the account is created.
 *
 * Both flows are a regression guard for the bug where accept() invalidated the
 * (now consumed) invitation query, refetched GET /invitations/{token}, got a
 * 404 and flipped the page to the "invalid invitation" screen instead of
 * proceeding to passkey enrolment.
 */
test.describe('Invitation signup', () => {
  test.beforeEach(async () => {
    await deleteAllEmails();
  });

  /** Read the 6-digit OTP out of the verification email body. */
  function extractOtp(text: string): string {
    const match = text.match(/\b(\d{6})\b/);
    if (!match) throw new Error(`No 6-digit code found in email:\n${text}`);
    return match[1];
  }

  test('email channel: skips OTP, creates account and enrols passkey', async ({ page }) => {
    const email = uniqueInviteEmail('invite-email');
    const instrument = await firstInstrumentName();

    // Backend sends the invitation email (which proves the address).
    const invitation = await createInvitation('email', email);
    expect(invitation.channel).toBe('email');

    const authenticator = await VirtualAuthenticator.create(page);
    try {
      // Open the signup link from the invitation.
      await page.goto(`/invite/${invitation.token}`);

      // Email is proven: the field is prefilled and read-only.
      const emailInput = page.locator('#email');
      await expect(emailInput).toHaveValue(email);
      await expect(emailInput).toHaveAttribute('readonly', '');

      await page.fill('#firstName', 'Test');
      await page.fill('#lastName', 'Invitee');
      await page.selectOption('#instrumentId', { label: instrument });

      // Proven email -> account created directly, no OTP screen.
      await page.click('button[type="submit"]');

      // Regression assertion: we must reach passkey enrolment, NOT the invalid
      // invitation screen (which the consumed-token refetch used to trigger).
      await expect(
        page.getByRole('button', { name: 'Créer une passkey' }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/invitation invalide|expirée/i)).toHaveCount(0);

      // Complete passkey enrolment and land on the "done" screen.
      await authenticator.withSuccessfulCeremony(async () => {
        await page.getByRole('button', { name: 'Créer une passkey' }).click();
      });
      await expect(page.getByText('Bienvenue !')).toBeVisible({ timeout: 10_000 });
    } finally {
      await authenticator.dispose();
      await deleteMemberByEmail(email);
    }
  });

  test('link channel: requires OTP, then creates account and enrols passkey', async ({ page }) => {
    const email = uniqueInviteEmail('invite-link');
    const instrument = await firstInstrumentName();

    // Link/QR channel: the target email is not proven -> OTP required.
    const invitation = await createInvitation('link');
    expect(invitation.channel).toBe('link');

    const authenticator = await VirtualAuthenticator.create(page);
    try {
      await page.goto(`/invite/${invitation.token}`);

      // Email is editable (not proven): the invitee enters their address.
      const emailInput = page.locator('#email');
      await expect(emailInput).not.toHaveAttribute('readonly', '');

      await page.fill('#firstName', 'Test');
      await page.fill('#lastName', 'Invitee');
      await page.fill('#email', email);
      await page.selectOption('#instrumentId', { label: instrument });
      await page.click('button[type="submit"]');

      // The dedicated OTP screen appears.
      await expect(page.getByText('Vérifiez votre email')).toBeVisible({ timeout: 10_000 });

      // Fetch the emailed code from Mailpit.
      const otpEmail = await waitForEmail(email, {
        subject: 'code de vérification',
        timeout: 15_000,
      });
      const code = extractOtp(otpEmail.Text || otpEmail.HTML);
      await deleteEmail(otpEmail.ID);

      // Enter the code. The OTP input auto-submits once all 6 digits are typed.
      await page.locator('input[data-input-otp="true"]').first().fill(code);

      // Regression assertion: after the OTP, the token is consumed but the page
      // must proceed to passkey enrolment rather than flipping to the invalid
      // invitation screen.
      await expect(
        page.getByRole('button', { name: 'Créer une passkey' }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/invitation invalide|expirée/i)).toHaveCount(0);

      await authenticator.withSuccessfulCeremony(async () => {
        await page.getByRole('button', { name: 'Créer une passkey' }).click();
      });
      await expect(page.getByText('Bienvenue !')).toBeVisible({ timeout: 10_000 });
    } finally {
      await authenticator.dispose();
      await deleteMemberByEmail(email);
    }
  });
});
