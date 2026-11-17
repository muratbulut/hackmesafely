// Kayıt defterinin süzgeçleri ve adresi (/yonetim/kayit-defteri?tur=oda&kisi=...&ara=...&bas=...&bit=...&sonraki=...).
// Süzgeçler adreste durur: sayfa yenilenince ya da bağlantı paylaşılınca aynı liste açılır.
// Tarayıcıda da çalışır (arama kutusu adresi buradan kurar); lib/audit.ts'den yalnızca tür alınır.

import type { AuditKind } from "@/lib/audit";
import { paths } from "@/lib/navigation";

/** Tür süzgecinin adresteki adı (?tur=oda): Türkçe, çünkü adresler Türkçe. Sıra süzgeç düğmelerinin sırasıdır. */
export const kindParams: Record<AuditKind, string> = {
  application: "talep",
  role: "rol",
  lab: "oda",
  content: "icerik",
  view: "bakis",
};

export const auditKindList = Object.keys(kindParams) as AuditKind[];

/** Eski adlar: "Lab" yerine "Oda" denmeden önce kaydedilmiş bağlantılar (?tur=lab) aynı listeyi açsın. */
const legacyKindParams: Record<string, AuditKind> = { lab: "lab" };

export function kindFromParam(value: unknown): AuditKind | null {
  if (typeof value === "string" && Object.hasOwn(legacyKindParams, value)) return legacyKindParams[value];
  const entry = Object.entries(kindParams).find(([, param]) => param === value);
  return entry ? (entry[0] as AuditKind) : null;
}

export type AuditFilters = {
  kind: AuditKind | null;
  /** Yapan kişinin kimliği (yönetim ekibinden biri). */
  person: string | null;
  /** Arama: kişi, okul, lab adı (ve ipucu, haber başlığı). */
  query: string;
  /** Tarih aralığı, Türkiye günü ("2026-11-14"); iki uç da dahil. Boşsa sınır yok. */
  from: string | null;
  to: string | null;
  /** Sayfalama: bu kaydın kimliğinden daha eski kayıtlar. */
  cursor: string | null;
};

export const emptyFilters: AuditFilters = { kind: null, person: null, query: "", from: null, to: null, cursor: null };

/** Aramanın en uzun hali (uzun metin sorguyu ağırlaştırmasın). */
export const maxQueryLength = 80;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const idLike = (value: string | undefined) => (value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null);

/** "2026-11-14" biçiminde gerçek bir gün mü (31 Şubat değil)? */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Adresteki parametrelerden süzgeçler; bozuk ya da bilinmeyen değer yok sayılır. Ters aralık düzeltilir. */
export function parseAuditFilters(params: Record<string, string | string[] | undefined>): AuditFilters {
  let from = first(params.bas);
  let to = first(params.bit);
  from = isDayKey(from) ? from : undefined;
  to = isDayKey(to) ? to : undefined;
  if (from && to && from > to) [from, to] = [to, from];
  return {
    kind: kindFromParam(first(params.tur)),
    person: idLike(first(params.kisi)),
    query: (first(params.ara) ?? "").replace(/\s+/g, " ").trim().slice(0, maxQueryLength),
    from: from ?? null,
    to: to ?? null,
    cursor: idLike(first(params.sonraki)),
  };
}

/** Süzgeçlerin adresi; boş süzgeç adrese yazılmaz. */
export function auditHref(filters: Partial<AuditFilters>): string {
  const search = new URLSearchParams();
  if (filters.kind) search.set("tur", kindParams[filters.kind]);
  if (filters.person) search.set("kisi", filters.person);
  if (filters.query?.trim()) search.set("ara", filters.query.trim());
  if (filters.from) search.set("bas", filters.from);
  if (filters.to) search.set("bit", filters.to);
  if (filters.cursor) search.set("sonraki", filters.cursor);
  const query = search.toString();
  return query ? `${paths.adminAudit}?${query}` : paths.adminAudit;
}

/** Süzgece uyan kayıtların CSV dosyası (sayfalamasız; app/yonetim/kayit-defteri/indir). */
export function auditExportHref(filters: Partial<AuditFilters>): string {
  return auditHref({ ...filters, cursor: null }).replace(paths.adminAudit, paths.adminAuditExport);
}

/** Herhangi bir süzgeç seçili mi ("Süzgeçleri temizle" için). */
export const hasFilters = (filters: AuditFilters) => !!(filters.kind || filters.person || filters.query || filters.from || filters.to);
