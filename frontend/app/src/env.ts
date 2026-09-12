interface EnvInterface {
  readonly VITE_BBE2_API_URL: string
  // Deployment environment ('beta' | 'production' | ...). Injected at runtime
  // via window.env (app-config.js) from the per-overlay ConfigMap, mirroring
  // the backend's ENVIRONMENT. Absent in local dev (window.env = {}).
  readonly VITE_ENVIRONMENT?: string
  // Feature flags (see utils/features.ts). Only the literal 'true' enables a
  // flag; absent fails closed.
  readonly VITE_FEATURE_SILENT_PASSKEY_UPGRADE?: string
}

declare global {
  interface Window { env: Partial<EnvInterface>; }
}

const resolved = { ...import.meta.env, ...window.env };

const env: EnvInterface = {
  ...resolved,
  // When VITE_BBE2_API_URL is not provided (build arg or runtime app-config),
  // fall back to the current origin. This keeps API calls same-origin (they
  // hit /api on the page's own host, which the Vite dev proxy or the prod
  // reverse proxy forwards to the backend) instead of the generated client's
  // hardcoded http://localhost default.
  VITE_BBE2_API_URL: resolved.VITE_BBE2_API_URL || window.location.origin,
};

export default env;
