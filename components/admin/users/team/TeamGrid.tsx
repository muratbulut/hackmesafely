"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { nextToast, UndoToast, type ToastData } from "@/components/admin/UndoToast";
import { undoTeamChange } from "@/lib/admin/team-actions";
import { permissionOrder } from "@/lib/admin/team-rules";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EditTeamMemberDialog, type TeamCardMember, type TeamEditDone } from "./EditTeamMemberDialog";
import { cellOf, PermissionCell as Cell, PermissionMiniGrid, TeamRoleChip as RoleChip } from "./TeamBits";

/**
 * Yönetim ekibi, izin matrisi (38 E2, 17 Kasım, Murat): masaüstünde satır kişi, sütun izin;
 * yönetici satırı hep dolu, öğrenci hesabına ve sorumluya verilemeyen izin çizgi. Telefonda her
 * kişi bir kart, altında aynı izinler küçük kutular. "Düzenle" izin penceresini açar (kendi
 * satırında "sen"); her değişiklikten sonra "Geri al".
 */
export function TeamGrid({ members }: { members: TeamCardMember[] }) {
  const t = getMessages().adminTeam;
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Her açılışta pencere kişinin güncel haliyle baştan başlar.
  const [session, setSession] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const member = members.find((m) => m.id === editing) ?? null;

  async function undo(target: NonNullable<TeamEditDone["undo"]>) {
    try {
      const result = await undoTeamChange(target);
      setToast(nextToast(result.ok ? { message: t.toasts.undone } : { message: t.errors[result.error], tone: "error" }));
    } catch {
      setToast(nextToast({ message: t.errors.failed, tone: "error" }));
    }
  }

  function done(result: TeamEditDone) {
    setOpen(false);
    const target = result.undo;
    setToast(nextToast({ message: result.message, undo: target ? () => void undo(target) : undefined }));
  }

  function edit(id: string) {
    setEditing(id);
    setSession((n) => n + 1);
    setOpen(true);
  }

  return (
    <>
      <div className="overflow-hidden rounded-[20px] border border-line bg-surface max-lg:hidden">
        <table aria-label={t.matrix.label} className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-bold tracking-[.8px] text-fg-4">
              <th scope="col" className="px-[18px] py-3 font-bold">
                {t.matrix.person}
              </th>
              <th scope="col" className="px-2 py-3 font-bold">
                {t.matrix.role}
              </th>
              {permissionOrder.map((p) => (
                <th key={p} scope="col" title={t.permissions[p].title} className="px-1.5 py-3 text-center font-bold">
                  <span className="block text-[11px] leading-tight">{t.matrix.short[p].toLocaleUpperCase("tr")}</span>
                </th>
              ))}
              <th scope="col" className="px-[18px] py-3">
                <span className="sr-only">{t.matrix.edit}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-[18px] py-3">
                  <Person member={m} />
                </td>
                <td className="px-2 py-3">
                  <RoleChip member={m} />
                </td>
                {permissionOrder.map((p) => (
                  <td key={p} className="px-1.5 py-3 text-center">
                    <Cell state={cellOf(m, p)} label={format(t.matrix.cell[cellOf(m, p)], { name: t.permissions[p].title })} />
                  </td>
                ))}
                <td className="px-[18px] py-3 text-right">
                  <EditButton member={m} onEdit={() => edit(m.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={t.matrix.label} className="m-0 flex list-none flex-col gap-2.5 p-0 lg:hidden">
        {members.map((m) => (
          <li key={m.id}>
            <article aria-label={m.name} className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <Person member={m} />
                <RoleChip member={m} className="ml-auto" />
              </div>
              <PermissionMiniGrid member={m} />
              <EditButton member={m} onEdit={() => edit(m.id)} className="self-start" />
            </article>
          </li>
        ))}
      </ul>

      <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs text-fg-3">
        {(["admin", "on", "locked"] as const).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <Cell state={state} small />
            {t.matrix.legend[state]}
          </li>
        ))}
      </ul>

      {member ? <EditTeamMemberDialog key={`${member.id}-${session}`} member={member} open={open} onClose={() => setOpen(false)} onDone={done} /> : null}
      <UndoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function Person({ member }: { member: TeamCardMember }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-card text-xl">
        {member.avatar}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <b className="text-[15px] leading-snug [overflow-wrap:anywhere]">{member.name}</b>
        <span className="text-xs text-fg-4">{member.meta}</span>
      </span>
    </span>
  );
}

function EditButton({ member, onEdit, className }: { member: TeamCardMember; onEdit: () => void; className?: string }) {
  const t = getMessages().adminTeam;
  if (member.me) return <span className={cn("text-xs text-fg-4", className)}>{t.me}</span>;
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={format(t.editFor, { name: member.name })}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-transparent px-3 text-[13px] font-bold whitespace-nowrap text-fg-2 transition-colors hover:border-accent hover:text-fg",
        className,
      )}
    >
      <Pencil className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
      {t.matrix.edit}
    </button>
  );
}
