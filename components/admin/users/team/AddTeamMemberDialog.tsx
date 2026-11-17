"use client";

import { Check, Mail, TriangleAlert } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Spinner } from "@/components/status/Spinner";
import type { TeamPermission } from "@/lib/admin/access";
import { addTeamMember, searchTeamCandidates, type TeamCandidate } from "@/lib/admin/team-actions";
import { grantableOrder, grantRefusal, type TeamRole } from "@/lib/admin/team-rules";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Drawer } from "../Drawer";
import { PersonPicker } from "./PersonPicker";
import { PermissionMiniGrid, TeamRoleChip } from "./TeamBits";
import { usePersonSearch } from "./usePersonSearch";

export type TeamAdded = { userId: string; op: string; name: string };

const roles: TeamRole[] = ["MEMBER", "ADMIN"];

/**
 * "Ekibe kişi ekle" penceresi (Kullanicilar-Son): 1 · Kim? (var olan hesabı ara), 2 · Rolü
 * (Sorumlu ya da Yönetici), 3 · Neleri yapabilir? (sorumlunun izinleri). Öğrenci hesabı yalnızca
 * Sorumlu olur ve yalnızca İpucu ve Gündem alır; kurallar sunucuda yeniden denetlenir.
 * Geniş çekmece (38 A4, 17 Kasım, Murat): masaüstünde sağdan, solda kişi, sağda rol, izinler ve
 * ekip listesindeki satırın önizlemesi; telefonda alttan, hepsi alt alta.
 */
export function AddTeamMemberDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (added: TeamAdded) => void }) {
  const t = getMessages().adminTeam;
  const a = t.addDialog;
  const ids = useId();
  const search = usePersonSearch(searchTeamCandidates);
  const [picked, setPicked] = useState<TeamCandidate | null>(null);
  const [role, setRole] = useState<TeamRole>("MEMBER");
  const [permissions, setPermissions] = useState<TeamPermission[]>([]);
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const student = picked?.kind === "student";
  const allowed: readonly TeamPermission[] = picked ? picked.allowed : grantableOrder;
  const refusal = picked ? grantRefusal({ role, permissions, studentAccount: student, allowed }) : null;
  const ready = !!picked && refusal === null;
  const localError = !tried || ready ? null : !picked ? a.pickFirst : refusal === "noPermission" ? a.pickPermission : t.errors[refusal ?? "invalid"];
  const error = localError ?? serverError;

  function pick(person: TeamCandidate | null) {
    setPicked(person);
    setServerError(null);
    if (person?.kind === "student") {
      setRole("MEMBER");
      setPermissions((list) => list.filter((p) => person.allowed.includes(p)));
    }
  }

  function toggle(permission: TeamPermission) {
    setServerError(null);
    setPermissions((list) => (list.includes(permission) ? list.filter((p) => p !== permission) : [...list, permission]));
  }

  function submit() {
    setTried(true);
    if (!ready || !picked) return;
    const target = picked;
    startTransition(async () => {
      try {
        const result = await addTeamMember({ userId: target.id, role, permissions: role === "ADMIN" ? [] : permissions });
        if (!result.ok) return setServerError(t.errors[result.error]);
        onAdded({ userId: target.id, op: result.op, name: result.name });
      } catch {
        setServerError(t.errors.failed);
      }
    });
  }

  const sectionLabel = "text-sm font-bold text-fg-2";

  return (
    <Drawer open={open} label={a.title} closeLabel={getMessages().admin.close} onClose={onClose} className="lg:w-[860px]">
      <h2 className="m-0 font-heading text-[22px] font-bold lg:-mt-[58px] lg:mr-14 lg:text-[24px]">{a.title}</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <PersonPicker
            label={a.who}
            inputId={`${ids}-search`}
            query={search.query}
            onQuery={search.change}
            people={search.people}
            loading={search.loading}
            pickedId={picked?.id ?? null}
            onPick={pick}
            hint={t.search.hint}
            empty={search.error ? t.errors[search.error as keyof typeof t.errors] ?? t.errors.failed : t.search.none}
          />
          <span className="text-xs leading-normal text-fg-4">{a.whoNote}</span>
          {student ? (
            <div className="flex gap-2.5 rounded-xl border border-warning/35 bg-warning/8 p-3 text-[13px] leading-normal text-fg">
              <TriangleAlert className="mt-px size-4 flex-none text-warning-fg" strokeWidth={2.2} aria-hidden="true" />
              <span>
                <b>{a.student}</b> {a.studentText}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <span id={`${ids}-role`} className={sectionLabel}>
              {a.role}
            </span>
            <div role="radiogroup" aria-labelledby={`${ids}-role`} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-deep p-1">
              {roles.map((key) => {
                const on = role === key;
                const locked = key === "ADMIN" && student;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={locked}
                    onClick={() => {
                      setRole(key);
                      setServerError(null);
                    }}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[9px] px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      on ? "bg-surface text-fg shadow" : "bg-transparent text-fg-3 hover:text-fg",
                    )}
                  >
                    <b className="text-sm">{a.roleOptions[key].title}</b>
                    <span className="text-[11px] leading-tight">{locked ? a.adminNoStudent : a.roleOptions[key].text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {role === "MEMBER" ? (
            <div className="flex flex-col gap-2.5">
              <span id={`${ids}-what`} className={sectionLabel}>
                {a.what}
              </span>
              <div role="group" aria-labelledby={`${ids}-what`} className="flex flex-col gap-2">
                {grantableOrder.map((permission) => {
                  const on = permissions.includes(permission);
                  const locked = !allowed.includes(permission);
                  return (
                    <button
                      key={permission}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => toggle(permission)}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface-deep px-3 py-2.5 text-left text-fg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-[22px] flex-none items-center justify-center rounded-[7px] border-2",
                          on ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-transparent",
                        )}
                      >
                        {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="flex flex-col gap-px">
                        <b className="text-sm">{t.permissions[permission].title}</b>
                        <span className="text-xs text-fg-4">{locked && student ? t.notForStudent : t.permissions[permission].text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-fg-4">{a.rolesOnlyAdmin}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning/8 px-3.5 py-3 text-[13px] leading-normal text-fg">{a.adminWarning}</div>
          )}

          <div className="flex flex-col gap-2" data-testid="team-preview">
            <span className="text-xs font-bold tracking-[0.8px] text-fg-4">{a.preview}</span>
            {picked ? (
              <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-line-strong bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-card text-xl">
                    {picked.avatar}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="text-[15px] leading-snug [overflow-wrap:anywhere]">{picked.name}</b>
                    <span className="text-xs text-fg-4">{a.previewMeta}</span>
                  </span>
                  <TeamRoleChip member={{ role, studentAccount: student }} />
                </div>
                <PermissionMiniGrid member={{ role, permissions, allowed }} />
              </div>
            ) : (
              <p className="m-0 rounded-[20px] border border-dashed border-line p-4 text-center text-[13px] text-fg-4">{a.previewEmpty}</p>
            )}
          </div>

          <span className="flex gap-2 text-[13px] leading-normal text-fg-3">
            <Mail className="mt-0.5 size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            <span>{a.mailNote}</span>
          </span>

          {error ? (
            <p role="alert" className="m-0 -mt-1 text-[13px] text-danger-fg">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-line bg-surface-raised text-[15px] font-bold text-fg">
              {a.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className={cn(
                "flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-colors",
                ready ? "bg-accent text-on-accent" : "bg-card text-fg-4",
              )}
            >
              {pending ? <Spinner tone="onAccent" /> : null}
              {pending ? a.submitting : a.submit}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
