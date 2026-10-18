import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("type scale", () => {
  it("locks the root so iOS text size cannot multiply every rem", () => {
    expect(css).toContain("-webkit-text-size-adjust: 100%");
    expect(css).toContain("text-size-adjust: 100%");
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*16px/s);
    expect(css).toContain("font-size: 1.125rem");
    expect(css).not.toMatch(/-apple-system/);
    expect(html).toContain("width=device-width, initial-scale=1, viewport-fit=cover");
    expect(html).not.toContain("maximum-scale");
  });

  it("keeps heading clamps inside a readable range", () => {
    const clamps = [...css.matchAll(/clamp\(([^)]+)\)/g)].map((match) => match[1]);
    expect(clamps.length).toBeGreaterThan(0);
    for (const value of clamps) {
      const parts = value.split(",").map((part) => part.trim());
      expect(parts).toHaveLength(3);
      const min = Number(parts[0].replace("rem", ""));
      const max = Number(parts[2].replace("rem", ""));
      expect(min).toBeGreaterThan(0);
      expect(max).toBeLessThanOrEqual(2.5);
      expect(max).toBeGreaterThan(min);
    }
  });
});
