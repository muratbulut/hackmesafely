import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuizView } from "@/components/lab/training/cards";
import { toClientCard } from "@/lib/lab/client";
import { parseTraining, type Card } from "@/lib/lab/content";

// Şehir Kapısı, Hesap ve giriş (18 Kasım): "Telefonuna bu kod geldi" sorusu SMS'i kilit ekranında gösterir.

const sms = { from: "Oyun Dünyası", text: "Giriş kodun: 482 913." };
const quiz: Card = {
  id: "kod",
  type: "quiz",
  question: "Telefonuna bu mesaj geldi. Ne anlama gelebilir?",
  options: ["Biri girmeye çalışıyor olabilir", "Önemi yok"],
  answer: 0,
  explain: "Kodu kimseye verme.",
  sms,
};

describe("mini testteki SMS bildirimi", () => {
  it("şema bildirimi kabul eder, tarayıcıya giden kartta doğru cevap yok ama bildirim var", () => {
    const content = parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [quiz] })!;
    const client = toClientCard(content.cards[0]);
    expect(client).toMatchObject({ type: "quiz", sms, link: null, art: null });
    expect(JSON.stringify(client)).not.toContain("answer");
  });

  it("bildirimi olmayan mini testte sms boş gelir", () => {
    const content = parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [{ ...quiz, sms: undefined }] })!;
    expect(toClientCard(content.cards[0])).toMatchObject({ sms: null });
  });

  it("gönderen ve metin sorunun üstünde görünür", () => {
    const card = toClientCard(parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [quiz] })!.cards[0]);
    if (card.type !== "quiz") throw new Error("quiz bekleniyordu");
    render(<QuizView card={card} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("sms-peek");
    expect(peek).toHaveTextContent("Oyun Dünyası");
    expect(peek).toHaveTextContent("Giriş kodun: 482 913.");
  });

  it("önce tahmin sorusu kendi etiketini ve yumuşak geri bildirimini gösterir", () => {
    const card = toClientCard(parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [{ ...quiz, guess: true }] })!.cards[0]);
    if (card.type !== "quiz") throw new Error("quiz bekleniyordu");
    expect(card.guess).toBe(true);
    const answer = { option: 1, result: { correct: false, answer: 0, explain: "Kodu kimseye verme." } };
    render(<QuizView card={card} answer={answer} busy={false} onAnswer={() => undefined} />);
    expect(screen.getByText("ÖNCE TAHMİN")).toBeInTheDocument();
    expect(screen.getByText("İyi tahmin, ama doğrusu A.")).toBeInTheDocument();
  });
});
