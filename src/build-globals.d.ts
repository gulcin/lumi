declare const __LUMI_VERSION__: string;
declare const __LUMI_SHA__: string;
declare const __LUMI_DATE__: string;

declare module "*.md?raw" {
  const content: string;
  export default content;
}
