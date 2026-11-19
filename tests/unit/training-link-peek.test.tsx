import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkPeek } from "@/components/lab/training/LinkPeek";
import { toClientCard } from "@/lib/lab/client";
import { parseTraining, type Card } from "@/lib/lab/content";

// Şehir Kapısı, Mesajı okumak (18 Kasım, Murat): "Basarsan nereye gidersin?" sorusu havada kalmasın;
// sorunun üstündeki mail düğmesi basmadan gerçek adrese bakmayı gösterir, sonra öğrenci dener.

const link = { text: "oyundunyasi.com/odul", url: "https://oyun-dunyasi-hediye.xyz/giris" };
const quiz: Card = {
  id: "nereye",
  type: "quiz",
  question: "Bu düğmeye basarsan nereye gidersin?",
  options: ["oyundunyasi.com/odul", "oyun-dunyasi-hediye.xyz/giris"],
  answer: 1,
  explain: "Yazı değil bağlantı.",
  link,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("mini testteki bağlantı düğmesi", () => {
  it("şema düğmeyi kabul eder, tarayıcıya giden kartta doğru cevap yok ama düğme var", () => {
    const content = parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [quiz] })!;
    const client = toClientCard(content.cards[0]);
    expect(client).toEqual({ id: "nereye", type: "quiz", question: quiz.question, options: ["oyundunyasi.com/odul", "oyun-dunyasi-hediye.xyz/giris"], art: null, link, sms: null, file: null, permission: null, wifi: null, popup: null, guess: false });
    expect(JSON.stringify(client)).not.toContain("answer");
  });

  it("düğmesi olmayan eski mini testte link boş gelir", () => {
    const plain = { ...quiz, link: undefined };
    const content = parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [plain] })!;
    expect(toClientCard(content.cards[0])).toMatchObject({ art: null, link: null });
  });

  it("önce kendisi gösterir, sonra sıra öğrenciye gelir; öğrenci bakınca adres açık kalır", () => {
    vi.useFakeTimers();
    render(<LinkPeek link={link} />);
    expect(screen.getByText("İzle: basmadan önce bağlantının adresine bakılıyor.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText("Gerçek adres ekranın alt köşesinde çıktı. Şimdi soruyu cevapla.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Sıra sende: farenle düğmenin üstüne gel, basma.")).toBeTruthy();

    const button = screen.getByRole("button", { name: link.text });
    // Düğme gerçek bağlantı değil: adresi yok, basınca hiçbir yere gitmez.
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("href")).toBeNull();
    fireEvent.focus(button);
    expect(screen.getByText("Gerçek adres ekranın alt köşesinde çıktı. Şimdi soruyu cevapla.")).toBeTruthy();
    expect(button.getAttribute("aria-describedby")).toBe("link-peek-url");
    expect(document.getElementById("link-peek-url")?.textContent).toBe(link.url);
  });

  it("telefonda basılı tutunca önizlemede adres çıkar, kısa dokunuş yetmez", () => {
    vi.useFakeTimers();
    render(<LinkPeek link={link} />);
    act(() => vi.advanceTimersByTime(5000));
    const button = screen.getByRole("button", { name: link.text });
    fireEvent.pointerDown(button, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerUp(button, { pointerType: "touch" });
    expect(screen.getByText("Sıra sende: düğmeye parmağınla basılı tut.")).toBeTruthy();
    fireEvent.pointerDown(button, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("BAĞLANTI ÖNİZLEMESİ")).toBeTruthy();
    expect(screen.getByText("Gerçek adres önizlemede çıktı. Şimdi soruyu cevapla.")).toBeTruthy();
  });
});

describe("düğmenin şeması", () => {
  it("adres ya da yazı uzunsa oda okunmaz", () => {
    const meta = { name: "Oda", summary: "Kısa" };
    expect(parseTraining({ meta, cards: [{ ...quiz, link: { text: "x".repeat(61), url: link.url } }] })).toBeNull();
    expect(parseTraining({ meta, cards: [{ ...quiz, link: { text: link.text, url: "x".repeat(121) } }] })).toBeNull();
  });
});
