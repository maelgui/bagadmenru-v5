import 'vite/client';

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_BBE2_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
