import 'vite/client';

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMeta {
  readonly env: EnvInterface
}
