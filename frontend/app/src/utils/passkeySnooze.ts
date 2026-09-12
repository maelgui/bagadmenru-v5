/**
 * Per-account snooze for passkey prompts.
 *
 * When a member declines (« Plus tard ») or abandons a passkey enrolment
 * offer, remember it locally and stop offering for a while: re-prompting on
 * every occasion is the fastest way to make people ignore the feature.
 *
 * The snooze is keyed by account id because this is a multi-account app
 * (family devices): one member declining must not silence the offer for the
 * other members using the same browser. localStorage is best-effort — private
 * browsing or blocked storage degrades to "never snoozed", which only means
 * the offer may show again.
 */

export const PASSKEY_SNOOZE_DAYS = 30;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- hours * minutes * seconds * ms
const DAY_MS = 24 * 60 * 60 * 1000;

const keyFor = (accountId: string) => `bmr:passkey-snooze:${accountId}`;

/** Whether passkey offers are currently snoozed for this account. */
export function isPasskeySnoozed(accountId: string): boolean {
  try {
    const raw = window.localStorage.getItem(keyFor(accountId));
    if (raw === null) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

/** Stop offering passkey enrolment to this account for PASSKEY_SNOOZE_DAYS. */
export function snoozePasskeyPrompts(accountId: string): void {
  try {
    window.localStorage.setItem(
      keyFor(accountId),
      String(Date.now() + PASSKEY_SNOOZE_DAYS * DAY_MS),
    );
  } catch {
    // Storage unavailable: the offer may show again, which is acceptable.
  }
}
