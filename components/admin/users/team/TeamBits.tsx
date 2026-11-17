import { Check, Minus } from "lucide-react";
import type { TeamPermission } from "@/lib/admin/access";
import { permissionOrder, roleLabelOf, type TeamRole } from "@/lib/admin/team-rules";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Yönetim ekibinin ortak parçaları (38 E2 izin matrisi ve A4 "Ekibe kişi ekle" önizlemesi).

export type CellState = "admin" | "on" | "off" | "locked";

type MatrixMember = { role: TeamRole; permissions: readonly TeamPermission[]; allowed: readonly TeamPermission[] };

/** Matrisin hücresi: yönetici hep açık, verilen izin açık, verilemeyen çizgi, diğeri kapalı. */
export function cellOf(member: MatrixMember, permission: TeamPermission): CellState {
  if (member.role === "ADMIN") return "admin";
  if (member.permissions.includes(permission)) return "on";
  return member.allowed.includes(permission) ? "off" : "locked";
}

export function TeamRoleChip({ member, className }: { member: { role: TeamRole; studentAccount: boolean }; className?: string }) {
  const t = getMessages().adminTeam;
  const label = roleLabelOf(member);
  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-[9px] text-xs font-bold whitespace-nowrap",
        label === "admin" ? "bg-warning/14 text-warning-fg" : "bg-purple/14 text-purple-fg",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", label === "admin" ? "bg-warning" : "bg-purple")} />
      {t.roles[label]}
    </span>
  );
}

/** Matrisin hücresi: yöneticide sarı tik, verilen izinde dolu tik, verilemeyende çizgi, kapalıda boş kutu. */
export function PermissionCell({ state, label, small = false }: { state: CellState; label?: string; small?: boolean }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "flex flex-none items-center justify-center",
        small ? "size-[18px] rounded-[5px]" : "mx-auto size-7 rounded-lg",
        state === "admin" && "bg-warning/14 text-warning-fg",
        state === "on" && "bg-accent text-on-accent",
        state === "off" && "border border-line",
        state === "locked" && "text-fg-4/50",
      )}
    >
      {state === "admin" || state === "on" ? (
        <Check className={small ? "size-3" : "size-4"} strokeWidth={3} aria-hidden="true" />
      ) : state === "locked" ? (
        <Minus className={small ? "size-3" : "size-3.5"} strokeWidth={2.5} aria-hidden="true" />
      ) : null}
    </span>
  );
}


/** İzinler küçük kutular, iki sütun (telefondaki kişi kartı ve "Ekibe kişi ekle" önizlemesi). */
export function PermissionMiniGrid({ member }: { member: MatrixMember }) {
  const t = getMessages().adminTeam;
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0">
      {permissionOrder.map((p) => {
        const state = cellOf(member, p);
        return (
          <li
            key={p}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold",
              state === "on" || state === "admin" ? "bg-card text-fg-2" : "text-fg-4",
            )}
          >
            <PermissionCell state={state} label={format(t.matrix.cell[state], { name: t.permissions[p].title })} small />
            <span aria-hidden="true" className="truncate">
              {t.matrix.short[p]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
