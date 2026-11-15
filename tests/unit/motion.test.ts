import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION_SCRIPT, motionCookie, motionFromCookie, onReducedMotionChange, prefersReducedMotion } from "@/lib/motion";

// "Hareketi azalt" (29, 11 Kasım): cihazın ayarına ek olarak sitenin "motion" çerezi ve
// <html data-motion="reduce">.

function clearCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

function stubDevice(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  clearCookies();
  document.documentElement.removeAttribute("data-motion");
  vi.unstubAllGlobals();
});

describe("Hareketi azalt çerezi", () => {
  it("yalnızca 'reduce' değerini tanır", () => {
    expect(motionFromCookie("motion=reduce")).toBe(true);
    expect(motionFromCookie("a=1; motion=reduce; b=2")).toBe(true);
    expect(motionFromCookie("motion=on")).toBe(false);
    expect(motionFromCookie("oldmotion=reduce")).toBe(false);
    expect(motionFromCookie("")).toBe(false);
  });

  it("açılınca bir yıllık çerez yazar, kapanınca siler; https'te Secure ekler", () => {
    expect(motionCookie(true, false)).toBe("motion=reduce; Max-Age=31536000; Path=/; SameSite=Lax");
    expect(motionCookie(false, false)).toBe("motion=; Max-Age=0; Path=/; SameSite=Lax");
    expect(motionCookie(true, true)).toMatch(/; Secure$/);
  });
});

describe("ilk boyamadan önce çalışan betik", () => {
  const run = () => new Function(MOTION_SCRIPT)();

  it("çerez varsa <html data-motion=reduce> koyar", () => {
    document.cookie = "motion=reduce; Path=/";
    run();
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduce");
  });

  it("çerez yoksa ya da bilinmeyen değerse dokunmaz", () => {
    run();
    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
    document.cookie = "motion=evet; Path=/";
    run();
    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
  });
});

describe("prefersReducedMotion", () => {
  it("cihazın ayarı ya da sitenin ayarı açıksa true", () => {
    stubDevice(false);
    expect(prefersReducedMotion()).toBe(false);
    document.documentElement.setAttribute("data-motion", "reduce");
    expect(prefersReducedMotion()).toBe(true);
    document.documentElement.removeAttribute("data-motion");
    stubDevice(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("sitenin ayarı değişince haber verir", async () => {
    stubDevice(false);
    const onChange = vi.fn();
    const stop = onReducedMotionChange(onChange);
    document.documentElement.setAttribute("data-motion", "reduce");
    await Promise.resolve();
    expect(onChange).toHaveBeenCalled();
    stop();
  });
});
