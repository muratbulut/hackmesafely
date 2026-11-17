// Yönetim ekranlarındaki (Özet, Canlı nabız, Kayıt defteri) tarih hesapları, Türkiye saatiyle.
// Türkiye 2016'dan beri yaz saati uygulamıyor (UTC+3 sabit); bu yüzden hesaplar saf ve
// sunucunun saat diliminden bağımsızdır (lib/classroom/progress.ts weekStart ile aynı kural).
// Hafta pazartesi 00.00'da başlar. Saf modül; birim testli.

import { format, getMessages } from "@/lib/i18n";

const offsetMs = 3 * 60 * 60 * 1000;
export const minuteMs = 60_000;
export const dayMs = 24 * 60 * minuteMs;
export const weekMs = 7 * dayMs;

/** Türkiye saatiyle yıl, ay (0-11), gün, haftanın günü (0 pazartesi), saat ve dakika. */
export function trParts(date: Date) {
  const local = new Date(date.getTime() + offsetMs);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: (local.getUTCDay() + 6) % 7,
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

const at = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day) - offsetMs);

/** O günün başı (Türkiye'de 00.00). */
export function dayStart(date: Date): Date {
  const p = trParts(date);
  return at(p.year, p.month, p.day);
}

/** Haftanın başı (pazartesi 00.00). */
export function weekStart(date: Date): Date {
  const p = trParts(date);
  return at(p.year, p.month, p.day - p.weekday);
}

/** Ayın ilk günü 00.00; `back` verilirse o kadar ay öncesinin. */
export function monthStart(date: Date, back = 0): Date {
  const p = trParts(date);
  return at(p.year, p.month - back, 1);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-11": Türkiye günü (TipDay.date, "Bugün değil" anahtarı). */
export function dayKey(date: Date): string {
  const p = trParts(date);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** "09:15" */
export function clock(date: Date): string {
  const p = trParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Bugünden başlayarak (bugün cumaysa o da) sıradaki `count` cuma; her biri o günün 00.00'ı. */
export function upcomingFridays(now: Date, count: number): Date[] {
  const start = dayStart(now).getTime();
  const ahead = (4 - trParts(now).weekday + 7) % 7;
  return Array.from({ length: count }, (_, i) => new Date(start + (ahead + 7 * i) * dayMs));
}

/** "9 Ekim" */
export function dayMonth(date: Date): string {
  const p = trParts(date);
  return `${p.day} ${getMessages().profile.months[p.month]}`;
}

/** "9 Eki" (grafiğin hafta etiketleri) */
export function dayMonthShort(date: Date): string {
  const p = trParts(date);
  return `${p.day} ${getMessages().adminOverview.monthsShort[p.month]}`;
}

/**
 * Kayıt defterindeki zaman: "Bugün 09:15", "Dün 22:10", bu yıl "9 Ekim", önceki yıllar
 * "9 Ekim 2025". Tam hali (`full`) üzerine gelince ve ekran okuyucuda.
 */
export function whenLabel(date: Date, now: Date): { short: string; full: string } {
  const t = getMessages().adminAudit.time;
  const p = trParts(date);
  const today = dayStart(now).getTime();
  const time = clock(date);
  const full = format(t.full, { date: dayMonth(date), year: p.year, time });
  if (date.getTime() >= today) return { short: format(t.today, { time }), full };
  if (date.getTime() >= today - dayMs) return { short: format(t.yesterday, { time }), full };
  if (p.year === trParts(now).year) return { short: dayMonth(date), full };
  return { short: format(t.dateYear, { date: dayMonth(date), year: p.year }), full };
}

/**
 * Canlı nabızdaki süre, tam yazımla: "az önce", "3 dakika önce", "2 saat önce", "dün", "4 gün önce"
 * ("2 sa" kısaltması belirsizdi; 17 Kasım, Murat).
 */
export function agoLabel(date: Date, now: Date): string {
  const t = getMessages().adminPulse.ago;
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 45) return t.now;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return format(t.minutes, { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format(t.hours, { n: hours });
  const days = Math.round(hours / 24);
  return days === 1 ? t.yesterday : format(t.days, { n: days });
}
