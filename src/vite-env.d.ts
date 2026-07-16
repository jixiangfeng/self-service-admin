/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POINT_QR_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
