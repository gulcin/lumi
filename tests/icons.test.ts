import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

function pngInfo(relativePath: string) {
  const data = readFileSync(new URL(relativePath, root));
  expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  let offset = 8;
  let width = 0;
  let height = 0;
  let color = -1;
  let interlace = -1;
  let srgb = false;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      color = chunk[9] ?? -1;
      interlace = chunk[12] ?? -1;
    }
    if (type === "sRGB" || type === "iCCP") srgb = true;
    expect(type).not.toBe("tRNS");
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return { bytes: data.length, width, height, color, interlace, srgb };
}

describe("home screen icons", () => {
  it("offers opaque sRGB PNGs at the paths iOS probes", () => {
    const expected: Array<[string, number]> = [
      ["public/apple-touch-icon.png", 180],
      ["public/apple-touch-icon-precomposed.png", 180],
      ["public/apple-touch-icon-167.png", 167],
      ["public/apple-touch-icon-152.png", 152],
      ["public/icons/icon-180.png", 180],
    ];
    for (const [file, size] of expected) {
      const info = pngInfo(file);
      expect(info.width, file).toBe(size);
      expect(info.height, file).toBe(size);
      expect(info.color, file).toBe(2);
      expect(info.interlace, file).toBe(0);
      expect(info.srgb, file).toBe(true);
      expect(info.bytes, file).toBeLessThan(50 * 1024);
    }
  });

  it("puts absolute sized links in the page and keeps icons out of the worker", () => {
    const html = readFileSync(new URL("index.html", root), "utf8");
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/lumi/apple-touch-icon.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="167x167" href="/lumi/apple-touch-icon-167.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="152x152" href="/lumi/apple-touch-icon-152.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/lumi/apple-touch-icon-precomposed.png" />');
    expect(html).not.toContain("./icons/icon-180.png");

    const vite = readFileSync(new URL("vite.config.ts", root), "utf8");
    expect(vite).toContain('"**/apple-touch-icon*.png"');
    expect(vite).toContain("navigateFallbackDenylist");
    expect(vite).toContain('importScripts: ["/lumi/sw-icon-bypass.js"]');
    expect(vite).toContain('href="/lumi/apple-touch-icon.png"');

    const bypass = readFileSync(new URL("public/sw-icon-bypass.js", root), "utf8");
    expect(bypass).toContain("apple-touch-icon");
    expect(bypass).toContain("stopImmediatePropagation");
    expect(bypass).not.toContain("respondWith");
  });
});
