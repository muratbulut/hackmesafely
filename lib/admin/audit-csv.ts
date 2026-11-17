// Kayıt defterinin CSV dosyası (hoca öncesi kontrol, 42): ekranda süzülen kayıtlar, Türkiye
// saatiyle. Excel'in Türkçe ayarı virgülü ondalık sayar, bu yüzden ayırıcı noktalı virgül; baştaki
// BOM Türkçe harflerin doğru açılması için. "=", "+", "-", "@" ile başlayan hücre formül sayılmasın
// diye başına kesme işareti alır (CSV formül enjeksiyonu). Saf modül; birim testli.

import type { AuditKind } from "@/lib/audit";
import { getMessages } from "@/lib/i18n";
import type { AuditFilters } from "./audit-url";
import { clock, dayKey } from "./calendar";

const separator = ";";
const bom = "﻿";

/** Tek hücre: formül gibi başlayan metin etkisizleşir; ayırıcı, tırnak ya da satır sonu varsa tırnağa alınır. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function auditCsv(rows: readonly { at: Date; actor: string; kind: AuditKind; sentence: string }[]): string {
  const t = getMessages().adminAudit;
  const { columns } = t.export;
  const header = [columns.time, columns.who, columns.kind, columns.what];
  const lines = rows.map((row) => [`${dayKey(row.at)} ${clock(row.at)}`, row.actor, t.kinds[row.kind], row.sentence]);
  return `${bom}${[header, ...lines].map((cells) => cells.map(csvCell).join(separator)).join("\r\n")}\r\n`;
}

/** "kayit-defteri-2026-11-01_2026-11-17.csv"; aralık yoksa bugünün tarihi. */
export function auditCsvFilename(filters: Pick<AuditFilters, "from" | "to">, now: Date): string {
  const base = getMessages().adminAudit.export.file;
  const range = filters.from ? `${filters.from}_${filters.to ?? dayKey(now)}` : (filters.to ?? dayKey(now));
  return `${base}-${range}.csv`;
}
