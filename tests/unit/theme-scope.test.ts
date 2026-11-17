import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Bilerek koyu kalan yerler (keep-dark, app/globals.css): koyu temanın açık temadan farklı her
// değişkeni keep-dark içinde koyu temadaki değeriyle yeniden tanımlanmalı. Biri unutulursa ya da
// koyu temada değişip burada değişmezse açık temadaki koyu kutu koyu temadan farklı görünür.
// Açık temada kartlar açıktır (17 Kasım): kart zeminleri kendiliğinden keep-dark almaz.
const css = readFileSync("app/globals.css", "utf8");

function block(start: string): string {
  const at = css.indexOf(start);
  expect(at, start).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`blok kapanmadı: ${start}`);
}

const vars = (body: string) => Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

describe("açık temada bilerek koyu kalan yerler (keep-dark)", () => {
  const dark = vars(block(':root,\n[data-theme="dark"]'));
  const gray = vars(block('[data-theme="gray"] {'));
  const keep = vars(block("@utility keep-dark"));

  it("iki temada farklı olan her değişken keep-dark'ta koyu temanın değeriyle", () => {
    const differing = Object.keys(dark).filter((k) => gray[k] !== dark[k]);
    expect(differing.length).toBeGreaterThan(20);
    for (const k of differing) expect(keep[k], k).toBe(dark[k]);
  });

  it("keep-dark'ta koyu temada olmayan ya da farklı bir değer yok", () => {
    for (const [k, v] of Object.entries(keep)) expect(v, k).toBe(dark[k]);
  });

  it("keep-dark yazı rengini de yeniden verir (açık temanın koyu yazısı koyu kutuda kalmaz)", () => {
    expect(block("@utility keep-dark")).toMatch(/\bcolor:\s*var\(--fg\);/);
  });

  it("açık temada kart zeminleri kendiliğinden koyu olmaz", () => {
    expect(css).not.toMatch(/@apply keep-dark/);
  });
});
