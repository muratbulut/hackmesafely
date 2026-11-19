export type TipKind = "report" | "door" | "shared" | "code" | "address" | "self" | "hurry" | "card" | "tip";

/**
 * İpucu metninden kartın başlığı ve görseli: metin içerikten gelir, başlığı yoktur; anahtar
 * kelimeye göre "Adrese bak", "Silme, bildir" gibi kısa bir başlık seçilir. Bulunamazsa "Unutma".
 */
export function tipKind(text: string): TipKind {
  const s = text.toLocaleLowerCase("tr");
  if (s.includes("bildir")) return "report";
  // Giriş görevi: çıkış yapmak ve ortak bilgisayar.
  if (/çıkış/.test(s)) return "door";
  if (s.includes("ortak bilgisayar") || s.includes("ortak cihaz")) return "shared";
  if (/\bkod|sms/.test(s)) return "code";
  if (s.includes("adres") || s.includes("@") || s.includes("gönderen")) return "address";
  if (s.includes("kendin") || s.includes("uygulama") || s.includes("resmi") || s.includes("başka bir yoldan")) return "self";
  if (s.includes("acele") || /\bdur\b/.test(s)) return "hurry";
  if (s.includes("kart")) return "card";
  return "tip";
}
