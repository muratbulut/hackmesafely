// Maillerin üst şeridindeki logo (alt alta "hack me / safely"). Mail programları SVG ve özel yazı tipi
// göstermediği için sitedeki küçük bir PNG kullanılır (public/mail/logo.png, 88×40, 3 kat çözünürlük). Resimler kapalıysa
// yerine alt metin ("Hack Me Safely") şeridin yazı biçimiyle görünür; düzen bozulmaz.

import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Üst şeritteki logonun HTML'i. `font` ve `color` alt metnin görünüşü içindir. */
export function mailLogo({ font, color }: { font: string; color: string }) {
  return `<img src="${escapeAttr(`${siteUrl()}/mail/logo.png`)}" width="88" height="40" alt="${escapeAttr(brand.name)}" style="display:block;border:0;width:88px;height:40px;font-family:${font};font-size:20px;font-weight:700;line-height:20px;color:${color}">`;
}
