import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuizView } from "@/components/lab/training/cards";
import { toClientCard } from "@/lib/lab/client";
import { parseTraining, type Card } from "@/lib/lab/content";

// Şehir Kapısı, Telefonun ve internet (18 Kasım): soru telefonun Wi‑Fi listesini ya da bir sitenin
// içinde açılan sahte pencereyi gösterir. İkisi de yalnızca gösterilir.

const base: Card = {
  id: "ag",
  type: "quiz",
  question: "Hangisine bağlanırsın?",
  options: ["Ev_Wifi", "Bedava_Internet"],
  answer: 0,
  explain: "Evin ağına.",
};
const wifi = [
  { name: "Ev_Wifi", locked: true },
  { name: "Bedava_Internet", locked: false },
];
const popup = { site: "film.xyz/izle", title: "Telefonun virüslü!", text: "Hemen temizle.", button: "Temizle" };
const clientOf = (card: Card) => {
  const client = toClientCard(parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [card] })!.cards[0]);
  if (client.type !== "quiz") throw new Error("quiz bekleniyordu");
  return client;
};

describe("mini testteki telefon ekranları", () => {
  it("şema Wi‑Fi listesini ve pencereyi kabul eder, tarayıcıya doğru cevap gitmez", () => {
    expect(clientOf({ ...base, wifi })).toMatchObject({ wifi, popup: null, sms: null });
    expect(clientOf({ ...base, popup })).toMatchObject({ popup, wifi: null });
    expect(JSON.stringify(clientOf({ ...base, wifi }))).not.toContain("answer");
  });

  it("tek ağlık liste şemaya uymaz", () => {
    expect(parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [{ ...base, wifi: [wifi[0]] }] })).toBeNull();
  });

  it("Wi‑Fi listesinde ağ adları ve şifreli olup olmadıkları görünür", () => {
    render(<QuizView card={clientOf({ ...base, wifi })} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("wifi-peek");
    expect(peek).toHaveTextContent("Ev_Wifi");
    expect(peek).toHaveTextContent("Şifreli");
    expect(peek).toHaveTextContent("Açık ağ");
  });

  it("pencere sitenin adresini ve uyarıyı gösterir, düğmesi tıklanmaz", () => {
    render(<QuizView card={clientOf({ ...base, popup })} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("popup-peek");
    expect(peek).toHaveTextContent("film.xyz/izle");
    expect(peek).toHaveTextContent("Telefonun virüslü!");
    expect(peek.querySelector("button")).toBeNull();
  });
});

describe("mini testteki sitedeki form", () => {
  const form = { site: "okul-cekilisi.xyz/katil", title: "Okul çekilişi", text: "Bilgilerini yaz.", fields: ["Adın soyadın", "T.C. kimlik numaran"], button: "Katıl" };

  it("şema formu kabul eder, tek alanlı form uymaz", () => {
    expect(clientOf({ ...base, form })).toMatchObject({ form, popup: null });
    expect(parseTraining({ meta: { name: "Oda", summary: "Kısa" }, cards: [{ ...base, form: { ...form, fields: ["Ad"] } }] })).toBeNull();
  });

  it("formun adresi, başlığı ve alanları görünür; yazılacak ya da basılacak bir şey yoktur", () => {
    render(<QuizView card={clientOf({ ...base, form })} answer={null} busy={false} onAnswer={() => undefined} />);
    const peek = screen.getByTestId("form-peek");
    expect(peek).toHaveTextContent("okul-cekilisi.xyz/katil");
    expect(peek).toHaveTextContent("T.C. kimlik numaran");
    expect(peek.querySelector("button, input, form")).toBeNull();
  });
});
