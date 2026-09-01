interface EnvInterface {
  readonly VITE_BBE2_API_URL: string
}

declare global {
  interface Window { env: EnvInterface; }
}

const env = { ...import.meta.env, ...window.env };

export default env;
