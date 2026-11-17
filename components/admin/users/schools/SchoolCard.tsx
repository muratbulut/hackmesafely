"use client";

import { Bell, Check, ChevronDown, Eye, MapPin, School, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SetupBar, SignalChip, TeacherAvatar } from "@/components/school/TeacherList";
import { hintText } from "@/lib/admin/users-model";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUsers } from "../context";
import { ClassMini, classSummary } from "../TeacherBits";
import type { AdminSchool, AdminTeacher } from "../types";
import { CoordinatorControl } from "./CoordinatorControl";

/**
 * Okul kartı, sade kart (38 S1, 17 Kasım, Murat): başlıkta ad, il · ilçe ve üç sayı (öğretmen,
 * öğrenci, bekleyen talep). Açılınca okul sorumlusu satırı (CoordinatorControl), etiketli 5 adımlık
 * kurulum hunisi ve öğretmen satırları (çekmece, sınıflar, gözünden bak, hatırlat).
 */
export function SchoolCard({
  school,
  teachers,
  open,
  onToggle,
}: {
  school: AdminSchool;
  teachers: AdminTeacher[];
  open: boolean;
  onToggle: () => void;
}) {
  const t = getMessages().adminUsers.schools;
  const listId = `school-teachers-${school.id}`;
  return (
    <section aria-label={school.name} className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className="flex w-full cursor-pointer flex-wrap items-center gap-3 border-0 bg-transparent p-3.5 text-left font-[inherit] text-fg lg:flex-nowrap lg:p-[18px]"
      >
        <ChevronDown
          className={cn("size-[18px] flex-none text-fg-3 transition-transform motion-reduce:transition-none", open ? "rotate-0" : "-rotate-90")}
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-card text-fg-2">
          <School className="size-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex flex-wrap items-center gap-2">
            <b className="font-heading text-[17px] break-words lg:text-[19px]">{school.name}</b>
            {school.pending > 0 ? <PendingBadge n={school.pending} /> : null}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] text-fg-3">
            <MapPin className="size-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
            {school.place}
          </span>
        </span>
        <span className="flex gap-5 text-right max-lg:w-full max-lg:justify-start max-lg:gap-6 max-lg:pl-[52px] max-lg:text-left">
          <Figure value={teachers.length} label={t.numbers.teachers} />
          <Figure value={school.students} label={t.numbers.students} />
          <Figure value={school.pending} label={t.numbers.pending} tone={school.pending > 0 ? "text-warning-fg" : undefined} />
        </span>
      </button>

      {open ? (
        <div id={listId} className="flex flex-col gap-3.5 border-t border-line p-3.5 [animation:fade-in_.2s_ease-out_both] lg:p-[18px]">
          <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-card bg-surface-deep px-3.5 py-3">
            <span className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-warning/12 text-warning-fg">
              <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
              {school.coordinator ? (
                <b className="text-sm">
                  {format(t.coordinator, { name: school.coordinator.name })}
                  {school.coordinator.isTeacher ? <span className="font-medium text-fg-3">{t.coordinatorTeaches}</span> : null}
                </b>
              ) : (
                <b className="text-sm text-fg-2">{t.noCoordinator}</b>
              )}
              <span className="text-xs leading-[1.45] text-fg-3">
                {school.coordinator ? (school.coordinatorApproves ? t.coordinatorApproves : t.coordinatorViews) : t.noCoordinatorText}
              </span>
            </span>
            <CoordinatorControl
              schoolId={school.id}
              schoolName={school.name}
              coordinator={school.coordinator}
              coordinatorApproves={school.coordinatorApproves}
            />
          </div>

          {teachers.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-line px-3.5 py-3 text-[13px] leading-normal text-fg-3">{t.noTeachers}</p>
          ) : (
            <>
              <Funnel funnel={school.funnel} />
              <ul className="m-0 -mx-3.5 -mb-3.5 list-none p-0 lg:-mx-[18px] lg:-mb-[18px]">
                {teachers.map((teacher) => (
                  <TeacherRow key={teacher.id} teacher={teacher} />
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Figure({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <b className={cn("font-heading text-[20px] leading-none tabular-nums", tone)}>{value.toLocaleString("tr-TR")}</b>
      <span className="text-[11px] text-fg-4">{label}</span>
    </span>
  );
}

function PendingBadge({ n, className }: { n: number; className?: string }) {
  const t = getMessages().adminUsers.schools;
  return (
    <span className={cn("inline-flex h-6 flex-none items-center gap-1.5 rounded-full bg-warning/12 px-[9px] text-xs font-bold whitespace-nowrap text-warning-fg", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
      {format(t.pending, { n })}
    </span>
  );
}

/** Kurulum hunisi: beş adım, her birinde o adıma ulaşan öğretmen sayısı (n/toplam) ve adı. */
function Funnel({ funnel }: { funnel: AdminSchool["funnel"] }) {
  const t = getMessages().adminUsers.schools;
  const steps = getMessages().school.drawer.steps;
  const total = funnel[0];
  const list = steps.map((step, i) => format(t.funnelItem, { step: step.title, n: funnel[i] })).join(", ");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-[0.8px] text-fg-4">{format(t.setupLabel, { n: total })}</span>
      <ol role="img" aria-label={format(t.funnelLabel, { list })} className="m-0 grid list-none grid-cols-5 gap-1.5 p-0 lg:gap-2.5">
        {steps.map((step, i) => {
          const n = funnel[i];
          const full = total > 0 && n === total;
          return (
            <li key={step.title} className="flex min-w-0 flex-col gap-1.5">
              <span
                className={cn(
                  "flex h-9 items-center justify-between gap-1 rounded-lg px-2",
                  n === 0 ? "bg-card text-fg-4" : full ? "bg-success/15 text-success-fg" : "bg-accent/12 text-accent-fg",
                )}
              >
                <b className="font-heading text-[17px] tabular-nums">{n}</b>
                <span className="text-[10px] font-bold opacity-70">{format(t.stepTotal, { total })}</span>
              </span>
              <span className="truncate text-[11px] text-fg-3">{step.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TeacherRow({ teacher }: { teacher: AdminTeacher }) {
  const t = getMessages().adminUsers;
  const s = t.schools;
  const d = getMessages().school.drawer;
  const { openTeacher, gaze, remind, isReminded, reminding } = useUsers();
  const [classesOpen, setClassesOpen] = useState(false);
  const classesId = `teacher-classes-${teacher.id}`;
  const reminded = isReminded(teacher);
  const ghost =
    "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line bg-transparent px-3 font-[inherit] text-[13px] font-bold text-fg-2 hover:border-accent hover:text-fg";

  return (
    <li className="flex flex-col gap-2.5 border-t border-line px-3.5 py-3.5 lg:px-[18px]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => openTeacher(teacher.id)}
          className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-[inherit] text-fg lg:w-[240px] lg:flex-none"
        >
          <TeacherAvatar emoji={teacher.avatar} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <b className="truncate text-[15px]">{teacher.name}</b>
            <span className="truncate text-xs text-fg-3">
              {format(s.teacherLine, { subject: teacher.subject || t.teachers.noSubject, classes: classSummary(teacher) })}
            </span>
          </span>
        </button>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-2.5">
            <SetupBar step={teacher.step} signal={teacher.signal} />
            <SignalChip signal={teacher.signal} />
          </span>
          <span className="text-xs text-fg-3">{hintText(teacher.hint)}</span>
        </span>
        <span className="flex flex-wrap gap-1.5 lg:justify-end">
          <button type="button" aria-expanded={classesOpen} aria-controls={classesId} onClick={() => setClassesOpen((v) => !v)} className={ghost}>
            {s.classes}
            <ChevronDown
              className={cn("size-4 transition-transform motion-reduce:transition-none", classesOpen && "rotate-180")}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </button>
          <button type="button" aria-label={format(s.gazeLabel, { name: teacher.name })} onClick={() => gaze(teacher)} className={ghost}>
            <Eye className="size-4" strokeWidth={2} aria-hidden="true" />
            {s.gaze}
          </button>
          {teacher.me ? null : reminded ? (
            <span className="inline-flex h-9 items-center gap-1.5 px-2 text-[13px] font-bold text-success-fg">
              <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
              {s.reminded}
            </span>
          ) : teacher.remind ? (
            <button
              type="button"
              aria-label={d.remind[teacher.remind]}
              title={d.remind[teacher.remind]}
              disabled={reminding !== null}
              onClick={() => remind(teacher)}
              className={cn(ghost, "border-warning/40 text-warning-fg hover:border-warning hover:text-warning-fg disabled:cursor-default disabled:opacity-60")}
            >
              <Bell className="size-4" strokeWidth={2} aria-hidden="true" />
              {s.remind}
            </button>
          ) : null}
        </span>
      </div>
      {classesOpen ? (
        <div id={classesId} className="[animation:fade-in_.2s_ease-out_both]">
          {teacher.classes.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 lg:grid-cols-3">
              {teacher.classes.map((item) => (
                <ClassMini key={item.id} item={item} compact />
              ))}
            </ul>
          ) : (
            <span className="block rounded-xl border border-dashed border-line p-3 text-[13px] text-fg-3">{s.noClasses}</span>
          )}
        </div>
      ) : null}
    </li>
  );
}
