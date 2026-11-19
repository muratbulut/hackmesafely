import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuizView } from "@/components/lab/training/cards";
import { splitFileName } from "@/components/lab/training/FilePeek";
import { toClientCard } from "@/lib/lab/client";
import { parseTraining, type Card } from "@/lib/lab/content";

// Şehir Kapısı, Dosya ve uygulama (18 Kasım): grupta gelen dosya ve izin penceresi sorunun üstünde görünür.

const file = { from: "7-B Sınıf grubu", text: "Ödev bu.", name: "odev.pdf.exe", size: "2,1 MB" };
const permission = { app: "Renkli Boyama", text: "kameraya erişmek istiyor.", icon: "camera" as const };
const quiz: Card = {
  id: "dosya",
  type: "quiz",
  question: "Bu dosya ne?",
  options: ["Bir PDF", "Bir program"],
  answer: 1,
  explain: "Son noktadan sonrası .exe.",
  file,
};
const meta = { name: "Oda", summary: "Kısa" };
const clientOf = (card: Card) => {
  const c = toClientCard(parseTraining({ meta, cards: [card] })!.cards[0]);
  if (c.type !== "quiz") throw new Error("quiz bekleniyordu");
  return c;
};

describe("mini testteki dosya eki ve izin penceresi", () => {
  it("dosya adı son noktadan ayrılır", () => {
    expect(splitFileName("odev.pdf.exe")).toEqual(["odev.pdf", "exe"]);
    expect(splitFileName("ElmasHack.apk")).toEqual(["ElmasHack", "apk"]);
    expect(splitFileName("README")).toEqual(["README", ""]);
    expect(splitFileName(".gizli")).toEqual([".gizli", ""]);
  });

  it("şema eki ve pencereyi kabul eder, tarayıcıya giden kartta doğru cevap yok", () => {
    const client = clientOf(quiz);
    expect(client).toMatchObject({ file, permission: null, sms: null, link: null });
    expect(JSON.stringify(client)).not.toContain("answer");
    expect(clientOf({ ...quiz, file: undefined, permission })).toMatchObject({ file: null, permission });
  });

  it("ek görünür, soyadı ancak cevaptan sonra ayrılır", () => {
    const card = clientOf(quiz);
    const { rerender } = render(<QuizView card={card} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("file-peek");
    expect(peek).toHaveTextContent("7-B Sınıf grubu");
    expect(screen.getByLabelText("Ek: odev.pdf.exe")).toBeInTheDocument();
    expect(peek).not.toHaveTextContent("soyadı");
    const answer = { option: 0, result: { correct: false, answer: 1, explain: "" } };
    rerender(<QuizView card={card} answer={answer} busy={false} onAnswer={() => undefined} />);
    expect(peek).toHaveTextContent("soyadı");
    expect(screen.getByText("Dosyanın soyadı: .exe")).toBeInTheDocument();
  });

  it("izin penceresinin düğmeleri basılmaz, yalnızca çizimdir", () => {
    render(<QuizView card={clientOf({ ...quiz, file: undefined, permission })} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("permission-peek");
    expect(peek).toHaveTextContent("Renkli Boyama kameraya erişmek istiyor.");
    expect(peek.querySelectorAll("button")).toHaveLength(0);
  });
});
