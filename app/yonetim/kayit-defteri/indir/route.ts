import type { NextRequest } from "next/server";
import { getPermittedAccess } from "@/lib/admin/access";
import { auditCsv, auditCsvFilename } from "@/lib/admin/audit-csv";
import { auditExportLimit, getAuditExport } from "@/lib/admin/audit-log";
import { parseAuditFilters } from "@/lib/admin/audit-url";
import { auditTarget, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

// Kayıt defterinin CSV olarak indirilmesi (hoca öncesi kontrol, 42): sayfadaki süzgeçlerle (tür,
// kişi, arama, tarih aralığı) aynı kayıtlar, sayfalamasız (en çok auditExportLimit). Yetki her
// istekte yeniden denetlenir; izni olmayan boş bir 404 alır. Her indirme kayıt defterine
// "audit.exported" olarak yazılır (kaç kayıt, hangi süzgeçler). Dosyada e-posta yok; öğrenci
// adları ekrandaki gibi "Ad S.".

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const access = await getPermittedAccess("AUDIT_LOG");
  if (!access) return notFound();

  const filters = parseAuditFilters(Object.fromEntries(request.nextUrl.searchParams));
  const now = new Date();
  const { rows, total } = await getAuditExport(filters, now);
  await writeAudit(db, {
    actorId: access.userId,
    action: "audit.exported",
    target: auditTarget.auditLog(),
    details: {
      count: rows.length,
      total,
      limit: auditExportLimit,
      filters: { kind: filters.kind, person: filters.person, query: filters.query || null, from: filters.from, to: filters.to },
    },
  });

  return new Response(auditCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${auditCsvFilename(filters, now)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
