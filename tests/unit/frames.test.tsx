import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  cardBackgroundOf,
  cardBackgrounds,
  frameStepOf,
  frameTierOf,
  isCardBackgroundCode,
  levelUpUnlocks,
  nextRewards,
} from "@/lib/progress/frames";
import { topLevel } from "@/lib/progress/levels";

// Avatar çerçeveleri, kart arka planları, sıradaki ödül ve seviye atlama kutlaması (29, 16 Kasım).

const acknowledge = vi.fn(async () => {});
vi.mock("@/lib/progress/level-up-actions", () => ({ acknowledgeLevelUp: () => acknowledge() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const { AvatarFrame } = await import("@/components/profile/frame/AvatarFrame");
const { CardBackdrop } = await import("@/components/profile/frame/CardBackdrop");
const { NextReward } = await import("@/components/profile/frame/NextReward");
const { LevelUpCelebration } = await import("@/components/profile/frame/LevelUpCelebration");

beforeAll(() => {
  // jsdom'da <dialog> modal açılmıyor; açık işareti yeter.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("seviyeye göre çerçeve", () => {
  it("1 ince halka, 2-3 baloncuk, 4-5 şimşek, 6-7 kor halka, 8-9 dijital, 10 kahraman", () => {
    const tiers = Array.from({ length: topLevel }, (_, i) => frameTierOf(i + 1));
    expect(tiers).toEqual(["plain", "bubble", "bubble", "spark", "spark", "ember", "ember", "digital", "digital", "hero"]);
  });

  it("her çerçeve ikinci seviyesinde canlanır; dijital 8-9'da aynı kalır", () => {
    const steps = Array.from({ length: topLevel }, (_, i) => frameStepOf(i + 1));
    expect(steps).toEqual(["calm", "calm", "lively", "calm", "lively", "calm", "lively", "calm", "calm", "calm"]);
  });

  it("aralık dışındaki seviye en yakın uca gider", () => {
    expect(frameTierOf(0)).toBe("plain");
    expect(frameTierOf(99)).toBe("hero");
  });

  it("çizilen çerçeve seviyeyi ve canlılığı taşır, süstür", () => {
    const { container, rerender } = render(<AvatarFrame level={3} emoji="🦊" />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveAttribute("data-frame", "bubble");
    expect(root).toHaveClass("af-lively");
    const lively = container.querySelectorAll(".af-bub").length;
    rerender(<AvatarFrame level={2} emoji="🦊" />);
    expect(container.querySelectorAll(".af-bub").length).toBeLessThan(lively);
    rerender(<AvatarFrame level={10} emoji="🦊" />);
    expect(container.firstElementChild).toHaveAttribute("data-frame", "hero");
    expect(container.querySelector(".af-core")).toHaveTextContent("🦊");
  });

  it("aynı sayfadaki iki kor halka çerçevesi aynı degrade kimliğini paylaşmaz (sakin ve canlı)", () => {
    const { container } = render(
      <>
        <AvatarFrame level={6} emoji="🦊" />
        <AvatarFrame level={7} emoji="🦊" />
      </>,
    );
    const ids = [...container.querySelectorAll("radialGradient")].map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("kart arka planı", () => {
  it("seviyeyle açılır: sade 1, dalgalar 3, bulutlar 5, gece 7, kuzey ışıkları 9", () => {
    expect(cardBackgrounds.map((b) => [b.code, b.level])).toEqual([
      ["plain", 1],
      ["waves", 3],
      ["clouds", 5],
      ["night", 7],
      ["aurora", 9],
    ]);
  });

  it("bilinmeyen ya da kilitli arka plan sade olur", () => {
    expect(isCardBackgroundCode("night")).toBe(true);
    expect(isCardBackgroundCode("city")).toBe(false);
    expect(cardBackgroundOf("night", 7)).toBe("night");
    expect(cardBackgroundOf("night", 6)).toBe("plain");
    expect(cardBackgroundOf("<script>", 10)).toBe("plain");
    expect(cardBackgroundOf(null, 10)).toBe("plain");
  });

  it("sade arka plan hiçbir şey çizmez, diğerleri süs olarak çizilir", () => {
    const { container, rerender } = render(<CardBackdrop code="plain" />);
    expect(container).toBeEmptyDOMElement();
    for (const { code } of cardBackgrounds.filter((b) => b.code !== "plain")) {
      rerender(<CardBackdrop code={code} />);
      expect(container.firstElementChild).toHaveAttribute("data-backdrop", code);
      expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    }
  });
});

describe("sıradaki ödül", () => {
  it("bir sonraki çerçeve adımını ve arka planı söyler", () => {
    expect(nextRewards(1)).toEqual({ frame: { level: 2, tier: "bubble", kind: "new" }, background: { level: 3, code: "waves" } });
    expect(nextRewards(2)).toEqual({ frame: { level: 3, tier: "bubble", kind: "stronger" }, background: { level: 3, code: "waves" } });
    expect(nextRewards(7).frame).toEqual({ level: 8, tier: "digital", kind: "new" });
    expect(nextRewards(8).frame).toEqual({ level: 10, tier: "hero", kind: "new" });
    expect(nextRewards(9).background).toBeNull();
    expect(nextRewards(topLevel)).toEqual({ frame: null, background: null });
  });

  it("kartta yazılır; en üst seviyede çizilmez", () => {
    const { rerender, container } = render(<NextReward level={2} emoji="🦊" />);
    expect(screen.getByTestId("next-reward")).toHaveTextContent("Seviye 3: Baloncuk çerçeven güçlenir");
    expect(screen.getByTestId("next-reward")).toHaveTextContent("Seviye 3: Yumuşak dalgalar kart arka planı");
    rerender(<NextReward level={9} emoji="🦊" />);
    expect(screen.getByTestId("next-reward")).toHaveTextContent("Seviye 10: Kahraman çerçevesi");
    rerender(<NextReward level={topLevel} emoji="🦊" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("seviye atlama kutlaması", () => {
  it("açılanları sayar: yeni çerçeve, güçlenen çerçeve, birden çok arka plan", () => {
    expect(levelUpUnlocks(3, 4)).toEqual({ frame: { level: 4, tier: "spark", kind: "new" }, backgrounds: [] });
    expect(levelUpUnlocks(4, 5)).toEqual({ frame: { level: 5, tier: "spark", kind: "stronger" }, backgrounds: ["clouds"] });
    expect(levelUpUnlocks(8, 9)).toEqual({ frame: null, backgrounds: ["aurora"] });
    expect(levelUpUnlocks(1, 7)).toEqual({ frame: { level: 6, tier: "ember", kind: "new" }, backgrounds: ["waves", "clouds", "night"] });
    expect(levelUpUnlocks(5, 5)).toEqual({ frame: null, backgrounds: [] });
  });

  it("seviyeyi, unvanı ve açılanı yazar; açılınca görüldü der, Harika kapatır", () => {
    acknowledge.mockClear();
    const onClose = vi.fn();
    render(<LevelUpCelebration levelUp={{ from: 4, to: 5 }} emoji="🦊" onClose={onClose} />);
    const dialog = screen.getByTestId("level-up");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("Seviye atladın");
    expect(screen.getByRole("heading", { name: "SEVİYE 5" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Dedektif");
    expect(dialog).toHaveTextContent("Şimşek çerçeven güçlendi");
    expect(dialog).toHaveTextContent("Süzülen bulutlar kart arka planı da açıldı");
    expect(acknowledge).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Harika" }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("level-up")).toBeNull();
  });

  it("çerçeve değişmeyen seviyede yeni unvanı yazar; önizlemede kayıt yok", () => {
    acknowledge.mockClear();
    render(<LevelUpCelebration levelUp={{ from: 8, to: 9 }} emoji="🦊" preview />);
    expect(screen.getByTestId("level-up")).toHaveTextContent("Yeni unvanın: Siber muhafız");
    expect(screen.getByTestId("level-up")).toHaveTextContent("Kuzey ışıkları kart arka planı da açıldı");
    expect(acknowledge).not.toHaveBeenCalled();
  });
});

describe("stiller", () => {
  const css = readFileSync("components/profile/frame/frame.css", "utf8");

  it("renkleri yalnızca tema değişkenlerinden alır", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("kullanılan her çerçeve ve arka plan rengi iki temada da tanımlı", () => {
    const globals = readFileSync("app/globals.css", "utf8");
    const used = new Set([...css.matchAll(/var\((--(?:frame|card-bg|level-up)-[\w-]+)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(20);
    for (const name of used) expect(globals.split(`${name}:`).length - 1, name).toBeGreaterThanOrEqual(2);
  });

  it("parçacık ve şimşeklerin düz hâli görünmez (Hareketi azalt'ta flaş yok)", () => {
    for (const selector of [".af-bolt {", ".af-ember {", ".af-lu-old {", ".af-lu-flash {", ".af-lu-burst i {"]) {
      const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
      expect(rule, selector).toContain("opacity: 0;");
    }
  });
});
