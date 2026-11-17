"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, Eye, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/profile/Dialog";
import { moveLab, publishLab, setLabVisibility, undoPublish, type ActionError } from "@/lib/admin/lab-actions";
import type { AdminLabRow, AdminNeighborhood } from "@/lib/admin/lab-data";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { nextToast, UndoToast, type ToastData } from "../UndoToast";

type Confirm = { kind: "hide" | "publish"; row: AdminLabRow; neighborhood: AdminNeighborhood } | null;

/**
 * Odanın yayın işlemleri (Odalar listesi ve odanın sayfası ortak): yayınla ve gizle onay penceresiyle,
 * yeniden aç ve sıra okları hemen; her işlemden sonra 5 saniyelik "Geri al". Sıra her okta sunucuya
 * yazılır (kendiliğinden kaydedilir).
 */
export function useLabActions() {
  const t = getMessages().admin;
  const l = t.list;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const say = (message: string, undo?: () => void) => setToast(nextToast({ message, undo }));
  const fail = (error: ActionError) => setToast(nextToast({ message: t.errors[error], tone: "error" }));

  function run(task: () => Promise<void>) {
    startTransition(async () => {
      try {
        await task();
      } catch {
        fail("failed");
      }
    });
  }

  function undo(action: () => Promise<{ ok: true } | { ok: false; error: ActionError }>) {
    run(async () => {
      const result = await action();
      if (!result.ok) return fail(result.error);
      say(l.toasts.undone);
    });
  }

  function hide(row: AdminLabRow, reason: string) {
    setConfirm(null);
    run(async () => {
      const result = await setLabVisibility(row.id, false, reason);
      if (!result.ok) return fail(result.error);
      say(format(l.toasts.hidden, { name: row.name }), () => undo(() => setLabVisibility(row.id, true)));
    });
  }

  function unhide(row: AdminLabRow) {
    run(async () => {
      const result = await setLabVisibility(row.id, true);
      if (!result.ok) return fail(result.error);
      say(format(l.toasts.published, { name: row.name }), () => undo(() => setLabVisibility(row.id, false, row.hideNote ?? "")));
    });
  }

  function publish(row: AdminLabRow) {
    setConfirm(null);
    run(async () => {
      // Yalnızca görülen taslak yayınlanır: bu arada değiştiyse sayfa yenilenir (D9).
      const result = await publishLab(row.id, { revision: row.revision });
      if (!result.ok && result.error === "conflict") {
        setToast(nextToast({ message: format(l.toasts.conflict, { name: row.name }), tone: "error" }));
        router.refresh();
        return;
      }
      if (!result.ok) return fail(result.error);
      say(format(l.toasts.published, { name: row.name }), () => undo(() => undoPublish(row.id, result.version)));
    });
  }

  function move(row: AdminLabRow, direction: -1 | 1) {
    run(async () => {
      const result = await moveLab(row.id, direction);
      if (!result.ok) return fail(result.error);
      say(format(l.toasts.moved, { name: row.name, direction: direction === -1 ? l.toasts.up : l.toasts.down }), () =>
        undo(() => moveLab(row.id, direction === 1 ? -1 : 1)),
      );
    });
  }

  /** Satırın tek düğmesi: yayındaysa Gizle (onaylı), gizliyse Yeniden aç, taslaksa Yayınla (onaylı). */
  function toggle(row: AdminLabRow, neighborhood: AdminNeighborhood) {
    if (row.status === "HIDDEN") return unhide(row);
    setNote("");
    setConfirm({ kind: row.status === "PUBLISHED" ? "hide" : "publish", row, neighborhood });
  }

  /** Depodan gelen yeni sürümü yayınlar (oda zaten yayında; onay penceresiyle). */
  function publishNew(row: AdminLabRow, neighborhood: AdminNeighborhood) {
    setConfirm({ kind: "publish", row, neighborhood });
  }

  const ui = (
    <>
      <Dialog open={confirm?.kind === "hide"} onClose={() => setConfirm(null)} labelledBy="admin-hide-title" className="max-w-[500px]">
        {confirm?.kind === "hide" ? (
          <>
            <DialogHead id="admin-hide-title" title={format(l.hideDialog.title, { name: confirm.row.name })} onClose={() => setConfirm(null)} />
            <div className="flex flex-col gap-2.5">
              {confirm.row.assignedClasses > 0 ? (
                <InfoLine Icon={AlertTriangle} tone="text-warning-fg">
                  {format(l.hideDialog.assigned, { n: confirm.row.assignedClasses })}
                </InfoLine>
              ) : null}
              {confirm.row.inProgress > 0 ? (
                <InfoLine Icon={Users} tone="text-accent-fg">
                  {format(l.hideDialog.inProgress, { n: confirm.row.inProgress })}
                </InfoLine>
              ) : null}
              <InfoLine Icon={ShieldCheck} tone="text-success-fg">
                {l.hideDialog.kept}
              </InfoLine>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-fg-2">
              {l.hideDialog.reason}
              <span className="-mt-1 text-xs font-medium text-fg-4">{l.hideDialog.reasonHint}</span>
              <input
                type="text"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder={l.hideDialog.reasonPlaceholder}
                className="h-[46px] w-full rounded-xl border border-line bg-canvas px-3.5 text-base font-normal text-fg placeholder:text-fg-4"
              />
            </label>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setConfirm(null)} className="h-12 flex-1 rounded-xl border border-line bg-surface-raised text-[15px] font-bold text-fg">
                {l.hideDialog.cancel}
              </button>
              <button type="button" onClick={() => hide(confirm.row, note)} className="h-12 flex-1 rounded-xl bg-warning text-[15px] font-bold text-on-warning">
                {l.hideDialog.confirm}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>

      <Dialog open={confirm?.kind === "publish"} onClose={() => setConfirm(null)} labelledBy="admin-publish-title" className="max-w-[500px]">
        {confirm?.kind === "publish" ? (
          <>
            <DialogHead id="admin-publish-title" title={format(l.publishDialog.title, { name: confirm.row.name })} onClose={() => setConfirm(null)} />
            {confirm.row.ready ? (
              <>
                <div className="flex flex-col gap-2.5">
                  <InfoLine Icon={Eye} tone="text-accent-fg">
                    {confirm.row.type === "TRAINING"
                      ? format(confirm.row.basic ? l.publishDialog.positionTraining : l.publishDialog.positionAdvanced, {
                          neighborhood: confirm.neighborhood.name,
                        })
                      : format(l.publishDialog.position, {
                          neighborhood: confirm.neighborhood.name,
                          n:
                            confirm.neighborhood.labs
                              .filter((r) => r.type === "SCENARIO" && (r.status === "PUBLISHED" || r.id === confirm.row.id))
                              .findIndex((r) => r.id === confirm.row.id) + 1,
                        })}
                  </InfoLine>
                  <InfoLine Icon={ShieldCheck} tone="text-success-fg">
                    {l.publishDialog.silent}
                  </InfoLine>
                </div>
                <Link
                  href={paths.adminLabPreview(confirm.row.id)}
                  className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-bold text-accent-fg no-underline"
                >
                  <Eye className="size-4" strokeWidth={2.2} aria-hidden="true" />
                  {l.publishDialog.preview}
                </Link>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setConfirm(null)} className="h-12 flex-1 rounded-xl border border-line bg-surface-raised text-[15px] font-bold text-fg">
                    {l.publishDialog.cancel}
                  </button>
                  <button type="button" onClick={() => publish(confirm.row)} className="h-12 flex-1 rounded-xl bg-success text-[15px] font-bold text-on-accent">
                    {l.publishDialog.confirm}
                  </button>
                </div>
              </>
            ) : (
              <>
                <InfoLine Icon={AlertTriangle} tone="text-warning-fg">
                  {l.publishDialog.notReady}
                </InfoLine>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setConfirm(null)} className="h-12 flex-1 rounded-xl border border-line bg-surface-raised text-[15px] font-bold text-fg">
                    {l.publishDialog.cancel}
                  </button>
                  <Link
                    href={paths.adminLab(confirm.row.id)}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-on-accent no-underline"
                  >
                    {l.publishDialog.openRoom}
                  </Link>
                </div>
              </>
            )}
          </>
        ) : null}
      </Dialog>

      <UndoToast toast={toast} onClose={() => setToast(null)} />
    </>
  );

  return { pending, toggle, publishNew, move, ui };
}

function DialogHead({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const t = getMessages().admin;
  return (
    <div className="flex items-start justify-between gap-2.5">
      <h2 id={id} className="m-0 font-heading text-[21px] leading-[1.25] font-bold">
        {title}
      </h2>
      <button type="button" onClick={onClose} aria-label={t.close} className="flex size-10 flex-none items-center justify-center rounded-xl text-fg-3 hover:text-fg">
        <X className="size-5" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

function InfoLine({ Icon, tone, children }: { Icon: LucideIcon; tone: string; children: ReactNode }) {
  return (
    <span className="flex gap-2.5 text-sm leading-normal text-fg-2">
      <Icon className={cn("mt-0.5 size-4 flex-none", tone)} strokeWidth={2.2} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
