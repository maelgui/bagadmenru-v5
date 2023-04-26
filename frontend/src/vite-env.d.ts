/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BBE2_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
