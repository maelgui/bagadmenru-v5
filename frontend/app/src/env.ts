interface EnvInterface {
  readonly VITE_BBE2_API_URL: string
  readonly VITE_OIDC_PROVIDER_URL: string
  readonly VITE_OIDC_CLIENT_ID: string
}

declare global {
  interface Window { env: EnvInterface; }
}

const env = { ...import.meta.env, ...window.env };

export default env;
