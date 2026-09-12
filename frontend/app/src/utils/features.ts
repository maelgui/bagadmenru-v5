import env from '../env';

/**
 * Runtime feature flags.
 *
 * A flag names a FEATURE, never an environment: which environments enable it
 * is deployment configuration (the per-overlay frontend ConfigMap rendered
 * into app-config.js, or a VITE_* variable in local dev), not code. Flipping
 * a flag is a config change — no rebuild, no redeploy of the image.
 *
 * Every flag fails closed: it is enabled only by the literal string 'true',
 * so an absent, empty or mistyped value disables the feature.
 *
 * Flags are scaffolding, not architecture: once a feature is rolled out
 * everywhere, delete its flag and the dead branch.
 */
const enabled = (value: string | undefined): boolean => value === 'true';

const features = {
  /**
   * Silent post-login passkey upgrade (WebAuthn conditional create).
   * Rollout: beta first; enable on prod by flipping the ConfigMap value.
   *
   * A getter, not a precomputed constant: the flag is read at call time, so
   * it does not depend on module-import order relative to app-config.js and
   * tests can flip it per case.
   */
  get silentPasskeyUpgrade(): boolean {
    return enabled(env.VITE_FEATURE_SILENT_PASSKEY_UPGRADE);
  },
} as const;

export default features;
