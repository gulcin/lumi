/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_LUMI_API_URL?: string;
  readonly VITE_FEEDBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __lumiAudit?: {
    start: (topicId: string) => boolean;
    showClock: (hour: number, minute: number) => boolean;
  };
}

declare module "qrcode" {
  const qrcode: {
    toDataURL(text: string, options?: { margin?: number; width?: number }): Promise<string>;
  };
  export default qrcode;
}
