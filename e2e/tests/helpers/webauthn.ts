import type { CDPSession, Page } from '@playwright/test';

/**
 * WebAuthn virtual authenticator driven via the Chrome DevTools Protocol (CDP).
 *
 * Chromium routes every `navigator.credentials.create()/get()` call in the page
 * to this simulated device, running its real WebAuthn implementation (RP ID,
 * challenge, signature). Chromium-only: CDP's WebAuthn domain does not exist in
 * Firefox/WebKit.
 */
export interface VirtualAuthenticatorOptions {
  protocol?: 'ctap2' | 'u2f';
  transport?: 'usb' | 'nfc' | 'ble' | 'internal';
  hasResidentKey?: boolean;
  hasUserVerification?: boolean;
  isUserVerified?: boolean;
  automaticPresenceSimulation?: boolean;
}

const DEFAULT_OPTIONS: Required<VirtualAuthenticatorOptions> = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  automaticPresenceSimulation: false,
};

export interface VirtualCredential {
  credentialId: string;
  rpId?: string;
  isResidentCredential: boolean;
  signCount: number;
  userHandle?: string;
}

export class VirtualAuthenticator {
  private constructor(
    private readonly client: CDPSession,
    readonly authenticatorId: string
  ) {}

  static async create(
    page: Page,
    options: VirtualAuthenticatorOptions = {}
  ): Promise<VirtualAuthenticator> {
    const client = await page.context().newCDPSession(page);
    await client.send('WebAuthn.enable');
    const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: { ...DEFAULT_OPTIONS, ...options },
    });
    return new VirtualAuthenticator(client, authenticatorId);
  }

  /** List credentials currently stored on the authenticator. */
  async getCredentials(): Promise<VirtualCredential[]> {
    const { credentials } = await this.client.send('WebAuthn.getCredentials', {
      authenticatorId: this.authenticatorId,
    });
    return credentials as VirtualCredential[];
  }

  async setUserVerified(isUserVerified: boolean): Promise<void> {
    await this.client.send('WebAuthn.setUserVerified', {
      authenticatorId: this.authenticatorId,
      isUserVerified,
    });
  }

  private async setAutomaticPresence(enabled: boolean): Promise<void> {
    await this.client.send('WebAuthn.setAutomaticPresenceSimulation', {
      authenticatorId: this.authenticatorId,
      enabled,
    });
  }

  /**
   * Arm the authenticator to respond successfully to any passkey prompt
   * (presence + successful user verification). Use when more than one ceremony
   * may occur — e.g. the login page fires on-mount conditional autofill AND the
   * user clicks the Passkey button — and the test asserts the end outcome
   * (authenticated) rather than a single ceremony event. Pair with `disarm()`.
   */
  async arm(): Promise<void> {
    await this.setUserVerified(true);
    await this.setAutomaticPresence(true);
  }

  /** Stop auto-responding to passkey prompts (reset after `arm()`). */
  async disarm(): Promise<void> {
    await this.setAutomaticPresence(false);
  }

  /**
   * Simulate a SUCCESSFUL passkey ceremony (create or assert). Enables presence
   * + successful user verification, runs the UI action that triggers the
   * ceremony, then waits for `credentialAdded` (registration) or
   * `credentialAsserted` (login). Presence is reset afterwards to avoid
   * unintended completions (e.g. conditional autofill).
   */
  async withSuccessfulCeremony(trigger: () => Promise<void>): Promise<void> {
    const completed = new Promise<void>((resolve) => {
      this.client.on('WebAuthn.credentialAdded', () => resolve());
      this.client.on('WebAuthn.credentialAsserted', () => resolve());
    });

    await this.setUserVerified(true);
    await this.setAutomaticPresence(true);
    try {
      // Trigger AFTER enabling presence to avoid a race where the page prompts
      // before the authenticator is ready to respond.
      await trigger();
      await completed;
    } finally {
      await this.setAutomaticPresence(false);
    }
  }

  /**
   * Complete an already-pending conditional (autofill) assertion.
   *
   * Conditional UI (`useBrowserAutofill: true`) issues a discoverable-credential
   * `get()` on page mount that sits pending until an authenticator with a
   * resident credential responds. Unlike `withSuccessfulCeremony`, the ceremony
   * is triggered by the page itself (not a click), so here we only arm the
   * authenticator (UV + presence) and await the assertion. A resident credential
   * must already exist on this authenticator.
   *
   * `arm` runs the action that starts the pending request (typically navigating
   * to the login page) — it is awaited before we enable presence to avoid a race.
   */
  async completeConditionalCeremony(arm: () => Promise<void>): Promise<void> {
    const asserted = new Promise<void>((resolve) => {
      this.client.on('WebAuthn.credentialAsserted', () => resolve());
    });

    await arm();
    await this.setUserVerified(true);
    await this.setAutomaticPresence(true);
    try {
      await asserted;
    } finally {
      await this.setAutomaticPresence(false);
    }
  }

  /**
   * Simulate a FAILED passkey ceremony (user verification refused). No event is
   * emitted on failure, so the caller provides a `postCheck` asserting the
   * expected post-failure UI state.
   */
  async withFailedCeremony(
    trigger: () => Promise<void>,
    postCheck: () => Promise<void>
  ): Promise<void> {
    await this.setUserVerified(false);
    await this.setAutomaticPresence(true);
    try {
      await trigger();
      await postCheck();
    } finally {
      await this.setAutomaticPresence(false);
      await this.setUserVerified(true);
    }
  }

  async removeCredential(credentialId: string): Promise<void> {
    await this.client.send('WebAuthn.removeCredential', {
      authenticatorId: this.authenticatorId,
      credentialId,
    });
  }

  /** Detach the virtual authenticator (teardown hygiene). */
  async dispose(): Promise<void> {
    // The page (and CDP session) may already be closed at end of test; ignore.
    try {
      await this.client.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId: this.authenticatorId,
      });
      await this.client.detach();
    } catch {
      // Session already closed: nothing to clean up.
    }
  }
}
