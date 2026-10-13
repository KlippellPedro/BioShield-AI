/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOSPITAL_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
