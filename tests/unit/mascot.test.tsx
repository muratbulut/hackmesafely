import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveWordmark } from "@/components/mascot/LiveWordmark";
import { LOGO_BANG_MS, LOGO_ROAM_MS, LOGO_WAIT_MS } from "@/components/mascot/logo-engine";
import { glyphs } from "@/components/mascot/glyphs";
import { Mascot, mascotMoods } from "@/components/mascot/Mascot";
import { PageOverlay, SHOW_AFTER_MS, SIGN_OUT_EVENT } from "@/components/mascot/PageOverlay";
import { LOOK_EVENT, lookAt } from "@/components/mascot/RoomMascot";
import { Spinner } from "@/components/status/Spinner";
import { brand, LOGO_A, logoGeometry, Wordmark } from "@/lib/brand";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

describe("maskot", () => {
  it("her zamanki hâlinde arada göz kırpar, süstür", () => {
    const { container } = render(<Mascot />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("mc", "mc-mood-idle", "mc-blink");
  });

  it("başka bir ruh hâlinde kırpmaz", () => {
    const { container } = render(<Mascot mood="hacked" />);
    expect(container.querySelector("svg")).toHaveClass("mc-mood-hacked");
    expect(container.querySelector("svg")).not.toHaveClass("mc-blink");
  });

  it("gövde logodaki a'dır; göz iç boşlukta, göz kapağı göze kırpılır", () => {
    const { container } = render(<Mascot />);
    const svg = container.querySelector("svg")!;
    const { hole, eye } = logoGeometry;
    const ball = svg.querySelector(".mc-ball")!;
    expect(svg.querySelector(".mc-trk")).toHaveAttribute("d", LOGO_A);
    expect(Number(ball.getAttribute("cx"))).toBe(hole.cx);
    expect(Number(ball.getAttribute("r"))).toBe(eye.ball);
    expect(svg.querySelector(".mc-lid")?.parentElement).toHaveAttribute("clip-path");
  });

  it("404'te gövde sıfırdır, göz sıfırın iç boşluğunda; dokununca seker", () => {
    const { container, rerender } = render(<Mascot mood="off" glyph="zero" />);
    const svg = container.querySelector("svg")!;
    const { hole } = glyphs.zero;
    expect(svg.querySelector(".mc-trk")).toHaveAttribute("d", glyphs.zero.d);
    expect(Number(svg.querySelector(".mc-ball")!.getAttribute("cx"))).toBe(hole.cx);
    expect(hole.r).toBeGreaterThan(logoGeometry.eye.ball);
    rerender(<Mascot mood="off" glyph="zero" poke />);
    expect(container.querySelector("svg")).toHaveClass("mc-r-try");
  });

  it("hap biçimli eski maskot hiçbir yerde kalmadı", () => {
    const { container } = render(<Mascot />);
    expect(container.querySelector("rect.mc-trk")).toBeNull();
  });

  it("renkleri yalnızca tema değişkenlerinden alır; her ruh hâlinin kuralı var", () => {
    const css = readFileSync("components/mascot/mascot.css", "utf8");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    for (const mood of mascotMoods.filter((m) => m !== "idle")) expect(css, mood).toContain(`.mc-mood-${mood}`);
  });

  it("göz beyazı iki temada da tanımlı", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css.match(/--logo-white:/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("bekleme işareti ana renk düğmesinde düğmenin yazı rengini alır", () => {
    const { container } = render(<Spinner tone="onAccent" />);
    expect(container.querySelector("svg")).toHaveClass("mc-mood-loading", "mc-on-accent");
  });
});

describe("logo", () => {
  it("düz hâlde göz üstteki a'dadır; tek başına duruyorsa ürün adını söyler", () => {
    const { container, rerender } = render(<Wordmark />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    const letters = svg.querySelectorAll(".mc-a");
    expect(letters).toHaveLength(2);
    expect(letters[0].querySelector(".mc-eye")).not.toBeNull();
    expect(letters[1].querySelector(".mc-eye")).toBeNull();
    rerender(<Wordmark labelled />);
    expect(screen.getByRole("img", { name: brand.name })).toBeInTheDocument();
  });

  it("gözün yuvası a harfinin içinde, göz yuvadan küçük", () => {
    const { a, hole, eye } = logoGeometry;
    expect(hole.cx - hole.r).toBeGreaterThan(a.left);
    expect(hole.cx + hole.r).toBeLessThan(a.right);
    expect(hole.cy - hole.r).toBeGreaterThan(a.top);
    expect(hole.cy + hole.r).toBeLessThan(a.bottom);
    expect(eye.ball).toBeLessThan(hole.r);
  });
});

describe("menüdeki canlı logo", () => {
  /** Ana sayfada bir tur: bekleme, gezme, son vuruşlar (ardından kaçış). */
  const ESCAPE_TURN = LOGO_WAIT_MS + LOGO_ROAM_MS.escape + LOGO_BANG_MS;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.mascotEyes;
    window.history.replaceState(null, "", "/");
  });

  function logo() {
    const { container } = render(<LiveWordmark />);
    const letters = Array.from(container.querySelectorAll(".mc-a"));
    const on = () => letters.map((l) => l.classList.contains("mc-a-on"));
    const moved = () => letters.some((l) => l.querySelector(".mc-bang")!.hasAttribute("transform"));
    return { container, letters, on, moved };
  }

  it("10 saniye kıpırdamaz, sonra a'nın içinde gezer", () => {
    const { on, moved } = logo();
    act(() => vi.advanceTimersByTime(LOGO_WAIT_MS - 100));
    expect(moved()).toBe(false);
    act(() => vi.advanceTimersByTime(1_000));
    expect(moved()).toBe(true);
    expect(on()).toEqual([true, false]);
  });

  it("ana sayfada göz öbür a'ya kaçar, renk de geçer; sonraki turda geri döner", () => {
    const { letters, on, moved } = logo();
    act(() => vi.advanceTimersByTime(ESCAPE_TURN + 3_000));
    expect(on()).toEqual([false, true]);
    expect(letters[0].querySelector(".mc-bang")).toHaveAttribute("opacity", "0");
    expect(letters[1].querySelector(".mc-bang")).not.toHaveAttribute("opacity");
    // Yerine oturunca durur, yeni tur 10 saniye sonra başlar.
    expect(moved()).toBe(false);
    act(() => vi.advanceTimersByTime(ESCAPE_TURN + 3_000));
    expect(on()).toEqual([true, false]);
  });

  it("diğer sayfalarda göz a'nın içinde kalır", () => {
    window.history.replaceState(null, "", "/odalar");
    const { on, moved } = logo();
    act(() => vi.advanceTimersByTime(LOGO_WAIT_MS + 1_000));
    expect(moved()).toBe(true);
    // Tur biter, göz yerine oturur; sonraki tur yine 10 saniye sonra.
    act(() => vi.advanceTimersByTime(LOGO_ROAM_MS.inside + LOGO_BANG_MS + 2_000));
    expect(on()).toEqual([true, false]);
    expect(moved()).toBe(false);
  });

  it("Hareketi azalt açıksa hiç kıpırdamaz", () => {
    document.documentElement.dataset.motion = "reduce";
    const { on, moved } = logo();
    act(() => vi.advanceTimersByTime(ESCAPE_TURN * 3));
    expect(moved()).toBe(false);
    expect(on()).toEqual([true, false]);
  });

  function form() {
    return render(
      <>
        <LiveWordmark />
        <input type="email" aria-label="E-posta" />
        <input type="password" aria-label="Şifre" autoComplete="current-password" />
      </>,
    );
  }

  it("şifre alanında gözünü kapatır; çıkınca açar", () => {
    form();
    fireEvent.focus(screen.getByLabelText("E-posta"));
    expect(document.documentElement.dataset.mascotEyes).toBeUndefined();
    fireEvent.focus(screen.getByLabelText("Şifre"));
    expect(document.documentElement.dataset.mascotEyes).toBe("shut");
    fireEvent.blur(screen.getByLabelText("Şifre"));
    expect(document.documentElement.dataset.mascotEyes).toBeUndefined();
  });

  it("şifre görünür yapılınca da (metin alanı) kapalı kalır; yazılanı hiçbir yere yazmaz", () => {
    const { container } = form();
    const input = screen.getByLabelText("Şifre") as HTMLInputElement;
    input.type = "text";
    fireEvent.focus(input);
    input.value = "GizliSifre!2026";
    fireEvent.input(input);
    expect(document.documentElement.dataset.mascotEyes).toBe("shut");
    expect(container.querySelector("svg")!.outerHTML).not.toContain("GizliSifre");
    expect(JSON.stringify(document.documentElement.dataset)).not.toContain("GizliSifre");
  });

  it("şifrede gözü kapatan kural logodaki göze de uyar", () => {
    const css = readFileSync("components/mascot/mascot.css", "utf8");
    expect(css).toContain('html[data-mascot-eyes="shut"] .mc-follow .mc-eye');
    const { container } = render(<LiveWordmark />);
    expect(container.querySelector("svg")).toHaveClass("mc", "mc-wordmark", "mc-follow", "mc-blink");
  });
});

describe("sayfa geçişi örtüsü", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = "/";
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function link(href: string, attrs: Record<string, string> = {}) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = "git";
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    document.body.appendChild(a);
    return a;
  }

  it("sayfa 0,3 saniyede açılmazsa görünür, adres değişince kalkar", () => {
    const view = render(<PageOverlay />);
    const a = link("/odalar");
    // İptal edilemeyen tıklama: jsdom sayfayı değiştirmeye çalışmaz, bizim dinleyici yine görür.
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    expect(screen.queryByTestId("page-overlay")).toBeNull();
    act(() => vi.advanceTimersByTime(SHOW_AFTER_MS - 10));
    expect(screen.queryByTestId("page-overlay")).toBeNull();
    act(() => vi.advanceTimersByTime(20));
    expect(screen.getByTestId("page-overlay")).toHaveAttribute("role", "status");
    expect(screen.getByText("Sayfa açılıyor")).toBeInTheDocument();
    pathname = "/odalar";
    view.rerender(<PageOverlay />);
    expect(screen.queryByTestId("page-overlay")).toBeNull();
    a.remove();
  });

  it("Next'in Link'i gibi tıklamayı iptal eden bağlantıda da görünür", () => {
    render(<PageOverlay />);
    const a = link("/odalar");
    const cancel = (e: Event) => e.preventDefault();
    a.addEventListener("click", cancel);
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    act(() => vi.advanceTimersByTime(SHOW_AFTER_MS + 10));
    expect(screen.getByTestId("page-overlay")).toBeInTheDocument();
    a.remove();
  });

  it("sayfadan çıkmayı soran editör tıklamayı durdurunca görünmez", () => {
    render(<PageOverlay />);
    const a = link("/odalar");
    const ask = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", ask, true);
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("page-overlay")).toBeNull();
    document.removeEventListener("click", ask, true);
    a.remove();
  });

  it("dış bağlantıda, yeni sekmede ve aynı sayfadaki çapada görünmez", () => {
    render(<PageOverlay />);
    const links = [link("https://ornek.example/"), link("/odalar", { target: "_blank" }), link("/#adimlar")];
    for (const a of links) a.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("page-overlay")).toBeNull();
    for (const a of links) a.remove();
  });

  it("çıkışta hemen görünür, sonra kalkar", () => {
    render(<PageOverlay />);
    act(() => {
      window.dispatchEvent(new Event(SIGN_OUT_EVENT));
    });
    expect(screen.getByText("Çıkış yapılıyor")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByTestId("page-overlay")).toBeNull();
  });
});

describe("odadaki maskot", () => {
  it("bağlantıya bakma olayı yalnızca öğeyi taşır (tuzak bilgisi yok)", () => {
    const seen: unknown[] = [];
    const onLook = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(LOOK_EVENT, onLook);
    const el = document.createElement("button");
    lookAt(el);
    lookAt(null);
    window.removeEventListener(LOOK_EVENT, onLook);
    expect(seen).toEqual([el, null]);
  });
});
