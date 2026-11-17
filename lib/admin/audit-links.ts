// Kayıt defterinde satırdan ilgili yere git (hoca öncesi kontrol, 42): talebin, odanın, kişinin,
// okulun, ipucunun ya da haberin sayfası. Bağlantı yalnızca bakan kişinin o sayfaya izni varsa
// çıkar (öbür türlü 404'e götürür); hedef silinmişse (adı bulunamadıysa) bağlantı yoktur.
// Saf modül; birim testli (tests/unit/admin-audit.test.ts).

import type { getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import type { AdminAccess, TeamPermission } from "./access";
import type { TargetLookup } from "./audit-sentences";
import { parseTarget } from "./audit-sentences";
import { usersHref } from "./users-model";

export type AuditLinkKind = Exclude<keyof ReturnType<typeof getMessages>["adminAudit"]["links"], "column" | "label">;
export type AuditLink = { href: string; kind: AuditLinkKind };

export type LinkAccess = Pick<AdminAccess, "permissions" | "canEdit" | "canPublish">;

// lib/admin/access.ts can ve hasLabAccess ile aynı; o modül veritabanını yüklediği için burada yeniden yazıldı.
const can = (access: LinkAccess, permission: TeamPermission) => access.permissions.includes(permission);
const hasLabAccess = (access: LinkAccess) => access.canEdit || access.canPublish;

/** Ekip işlemleri kişinin profiline değil, Yönetim ekibi sekmesine götürür. */
const isTeamAction = (action: string) => action.startsWith("team.") || action === "user.promote_admin";

export function auditLink(entry: { action: string; target: string }, lookup: TargetLookup, access: LinkAccess): AuditLink | null {
  const target = parseTarget(entry.target);
  const info = target ? lookup.get(entry.target) : undefined;
  if (!target || !info) return null;

  switch (info.kind) {
    case "user":
      if (!can(access, "ROLES")) return null;
      if (isTeamAction(entry.action) || info.role === "ADMIN") return { href: usersHref({ tab: "ekip" }), kind: "team" };
      if (info.role === "STUDENT") return { href: usersHref({ student: target.id }), kind: "student" };
      if (info.role === "TEACHER") return { href: usersHref({ tab: "ogretmenler", teacher: target.id }), kind: "teacher" };
      return null;
    case "school":
      return can(access, "ROLES") ? { href: usersHref({ view: "okullar", search: info.name }), kind: "school" } : null;
    case "application":
      // Talepler sayfası (?talep=) talebin sekmesini kendisi seçer (lib/admin/applications.ts).
      return can(access, "APPLICATIONS") ? { href: `${paths.adminApplications}?talep=${encodeURIComponent(target.id)}`, kind: "application" } : null;
    case "lab":
      return hasLabAccess(access) ? { href: paths.adminLab(target.id), kind: "lab" } : null;
    case "tip":
      return can(access, "TIPS") ? { href: paths.adminTips, kind: "tip" } : null;
    case "news":
      return can(access, "NEWS") ? { href: paths.adminArticle(target.id), kind: "news" } : null;
  }
}
