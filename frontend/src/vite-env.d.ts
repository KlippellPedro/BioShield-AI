/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_HOSPITAL_CODE?: string;
  readonly VITE_HOSPITAL_NAME?: string;
  readonly VITE_HOSPITAL_SHORT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
