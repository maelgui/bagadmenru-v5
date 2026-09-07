import aaguids from '../assets/passkeys/aaguid.json';

/**
 * Community-sourced mapping of authenticator AAGUIDs to a human-friendly
 * provider name and official brand icons (light/dark SVG data URIs), from
 * passkeydeveloper/passkey-authenticator-aaguids (backed by the FIDO Alliance
 * / passkeys.dev). Used to show real provider names and logos in the passkey
 * management UI instead of generic placeholders.
 *
 * See https://github.com/passkeydeveloper/passkey-authenticator-aaguids
 */
interface AaguidEntry {
  name: string;
  icon_light?: string;
  icon_dark?: string;
}

const aaguidMap: Record<string, AaguidEntry | undefined> = aaguids;

export interface AuthenticatorInfo {
  /** The provider's human-friendly name, or `undefined` if the AAGUID is unknown. */
  name?: string;
  /** Official brand icon (SVG data URI) for the given theme, or `undefined`. */
  icon?: string;
}

/**
 * Resolve an authenticator AAGUID to its provider name and themed brand icon.
 * Returns empty fields for unknown AAGUIDs so callers can fall back to a
 * generic passkey label/icon.
 */
export function resolveAuthenticator(aaguid: string, theme: 'light' | 'dark'): AuthenticatorInfo {
  const entry = aaguidMap[aaguid];
  if (!entry) return {};
  return {
    name: entry.name,
    icon: theme === 'dark' ? entry.icon_dark : entry.icon_light,
  };
}
