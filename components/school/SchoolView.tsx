"use client";

import { FileText, Shield } from "lucide-react";
import { useState } from "react";
import { format, getMessages } from "@/lib/i18n";
import { endorseApplication, notRecognizeApplication, remindTeacher, undoSchoolDecision, type SchoolActionError } from "@/lib/teacher/school-actions";
import { BulletinCard } from "./BulletinCard";
import { ClassSheet } from "./ClassSheet";
import { copyText, InviteButton } from "./InviteLink";
import { RequestSheet, RequestsCard } from "./RequestsCard";
import { LegendCard, SchoolBoard, WeekCard } from "./SchoolBoard";
import { SchoolSummary } from "./SchoolSummary";
import { nextToast, SchoolToast, type SchoolToastData } from "./SchoolToast";
import { TeacherDrawer } from "./TeacherDrawer";
import type { SchoolRequest, SchoolTeacher, SchoolView as SchoolViewData } from "./types";

type Open = { kind: "teacher" | "request" | "class"; id: string } | null;

/**
 * Okulum (hoca öncesi kontrol 34, "E Karne + pano"): üstte okulun tek cümlesi ve sınıfların dört
 * durumu, sonra bekleyen talepler ("İncele" penceresinde ayrıntı ve karar), öğretmenler ve renkli
 * sınıf kutuları (dokununca sınıf penceresi), en altta haftanın grafiği ve renklerin açıklaması.
 * "PDF olarak indir" yalnızca haftalık bülteni yazdırır (ekranda gizli, BulletinCard). Kararlar ve
 * hatırlatma sunucu eylemleriyle (lib/teacher/school-actions.ts); her kararın "Geri al"ı var.
 * Sayfa öğrenci adı, puanı ya da raporu hiç almaz (components/school/types.ts).
 */
export function SchoolView({ view }: { view: SchoolViewData }) {
  const t = getMessages().school;
  const [toast, setToast] = useState<SchoolToastData | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const classes = view.teachers.flatMap((x) => x.classes);
  const teacher = open?.kind === "teacher" ? (view.teachers.find((x) => x.id === open.id) ?? null) : null;
  const request = open?.kind === "request" ? (view.requests.find((x) => x.id === open.id) ?? null) : null;
  const classItem = open?.kind === "class" ? (classes.find((x) => x.id === open.id) ?? null) : null;

  const say = (message: string, extra: Omit<SchoolToastData, "id" | "message"> = {}) => setToast(nextToast({ message, ...extra }));
  const sayError = (error: SchoolActionError) => say(t.errors[error], { tone: "error" });

  async function undo(request: SchoolRequest) {
    const result = await undoSchoolDecision(request.id);
    if (result.ok) say(t.requests.toast.undone);
    else sayError(result.error);
  }

  async function endorse(request: SchoolRequest) {
    const result = await endorseApplication(request.id);
    if (!result.ok) return sayError(result.error);
    close();
    say(format(result.approved ? t.requests.toast.approved : t.requests.toast.endorsed, { name: result.name }), { undo: () => void undo(request) });
  }

  async function notRecognize(request: SchoolRequest) {
    const result = await notRecognizeApplication(request.id);
    if (!result.ok) return sayError(result.error);
    close();
    say(format(t.requests.toast.notRecognized, { name: result.name }), { undo: () => void undo(request) });
  }

  async function remind(target: SchoolTeacher) {
    const result = await remindTeacher(target.id);
    if (!result.ok) return sayError(result.error);
    say(format(t.reminderSent, { name: result.name, what: t.reminderWhat[result.kind] }));
  }

  async function copyInvite() {
    const copied = await copyText(view.inviteUrl);
    say(copied ? t.invite.copied : t.invite.copyFailed, copied ? {} : { tone: "error" });
  }

  function printBulletin() {
    say(t.pdfHint);
    // Yazdırma penceresi sayfayı dondurur; önce bildirim görünsün.
    window.setTimeout(() => window.print(), 250);
  }

  // Pencere açıkken bildirim onun içinde çizilir: açık <dialog> sayfanın geri kalanının üstündedir.
  const toastBox = <SchoolToast toast={toast} onClose={() => setToast(null)} />;
  const place = format(t.place, { province: view.school.province, district: view.school.district });
  const teacherOf = (classId: string) => view.teachers.find((x) => x.classes.some((c) => c.id === classId));

  return (
    <div className="relative mx-auto max-w-[1200px] px-4 pt-4 pb-10 lg:px-6 lg:pt-9 lg:pb-[72px] print:max-w-none print:p-0">
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4 print:hidden">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[2px] text-warning-fg">
              <Shield className="size-[15px]" strokeWidth={2} aria-hidden="true" />
              {t.eyebrow}
            </span>
            <h1 className="m-0 font-heading text-[28px] leading-[1.1] font-bold lg:text-[40px]">{view.school.name}</h1>
            <p className="m-0 text-sm leading-[1.55] text-fg-2 lg:text-base">
              {format(t.subtitle, { place, me: view.meTeacher ? t.meTeacher : t.meOnly })}
            </p>
          </div>
          <div role="group" aria-label={t.actionsLabel} className="grid grid-cols-2 gap-2 lg:flex lg:flex-none lg:gap-2.5">
            <button
              type="button"
              onClick={printBulletin}
              aria-label={t.pdf}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 font-[inherit] text-sm font-bold text-fg transition-colors hover:border-accent lg:h-12 lg:px-4 lg:text-[15px]"
            >
              <FileText className="size-[17px] text-fg-2" strokeWidth={2} aria-hidden="true" />
              <span className="lg:hidden">{t.pdfShort}</span>
              <span className="max-lg:hidden">{t.pdf}</span>
            </button>
            <InviteButton onCopy={copyInvite} />
          </div>
        </div>

        <SchoolSummary view={view} classes={classes} />
        <RequestsCard requests={view.requests} handled={view.handled} onOpen={(id) => setOpen({ kind: "request", id })} />
        <SchoolBoard teachers={view.teachers} onOpenTeacher={(id) => setOpen({ kind: "teacher", id })} onOpenClass={(id) => setOpen({ kind: "class", id })} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <WeekCard bulletin={view.bulletin} />
          <LegendCard />
        </div>

        {/* Yalnızca yazdırırken ("PDF olarak indir"): haftalık bülten. */}
        <div className="hidden print:block">
          <BulletinCard bulletin={view.bulletin} schoolName={view.school.name} />
        </div>
      </div>

      <TeacherDrawer teacher={teacher} onClose={close} onRemind={remind}>
        {teacher ? toastBox : null}
      </TeacherDrawer>
      <RequestSheet request={request} coordinatorApproves={view.school.coordinatorApproves} onClose={close} onEndorse={endorse} onNotRecognize={notRecognize}>
        {request ? toastBox : null}
      </RequestSheet>
      <ClassSheet
        item={classItem}
        onClose={close}
        onOpenTeacher={() => {
          const owner = classItem ? teacherOf(classItem.id) : undefined;
          if (owner) setOpen({ kind: "teacher", id: owner.id });
        }}
      >
        {classItem ? toastBox : null}
      </ClassSheet>
      {open ? null : toastBox}
    </div>
  );
}
