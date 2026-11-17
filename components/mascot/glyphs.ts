import { LOGO_A, logoGeometry } from "@/lib/brand";

/*
 * Maskotun gövdesi olabilen harfler: Montserrat Alternates Bold'dan çizilmiş yollar (logoyla aynı
 * yazı tipi, 1000 birimlik em karesi; yazı tipi siteye yüklenmez). Göz harfin iç boşluğunda durur.
 *  - a: logodaki gözlü a (maskotun her zamanki hâli).
 *  - zero: 404'teki sıfır.
 * box: viewBox (harfin sınırları ve çevresinde 10 birim pay); hole: iç boşluğun merkezi ve yarıçapı.
 */
export type MascotGlyph = "a" | "zero";

export const glyphs = {
  a: { d: LOGO_A, box: "22 -556 606 574", hole: logoGeometry.hole },
  zero: {
    d: "M39-350Q39-463 78-544Q116-626 184-669Q252-712 339-712Q426-712 494-669Q562-626 600-544Q639-463 639-350Q639-237 600-156Q562-74 494-31Q426 12 339 12Q252 12 184-31Q116-74 78-156Q39-237 39-350ZM476-350Q476-465 440-520Q403-575 339-575Q276-575 240-520Q203-465 203-350Q203-235 240-180Q276-125 339-125Q403-125 440-180Q476-235 476-350Z",
    box: "29 -722 620 744",
    hole: { cx: 339.5, cy: -350, r: 136.5 },
  },
} as const;

/** 404'ün dördü (aynı yazı tipinden); genişliği 689 birim. */
export const FOUR = { d: "M680-147H566V0H408V-147H31V-256L361-700H531L225-279H413V-410H566V-279H680Z", box: "21 -722 669 744" } as const;

/** Gözün kutudaki yeri (0 ile 1 arası); bakış yönü buna göre hesaplanır (useEyeTracking). */
export function eyeSpot(glyph: MascotGlyph) {
  const g = glyphs[glyph];
  const [x, y, w, h] = g.box.split(" ").map(Number);
  return { x: (g.hole.cx - x) / w, y: (g.hole.cy - y) / h };
}
