"use client";

import { Bell, Check, TriangleAlert } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { format, getMessages } from "@/lib/i18n";
import { minStudentsJoined } from "@/lib/school/bulletin-model";
import { cn } from "@/lib/utils";
import { SchoolSheet, SheetClose } from "./SchoolSheet";
import { SignalChip, signalTone, TeacherAvatar } from "./TeacherList";
import type {
  ClassAttention,
  SchoolClass,
  SchoolTeacher,
  TeacherHint,
} from "./types";

function hintText(hint: TeacherHint) {
  const t = getMessages().school.drawer.hints;
  switch (hint.kind) {
    case "created":
      return format(t.created, { n: hint.n });
    case "waitingDays":
      return format(t.waitingDays, { days: hint.days });
    default:
      return t[hint.kind];
  }
}

function attentionText(attention: ClassAttention) {
  const t = getMessages().school.classCard.attention;
  return attention.kind === "notStarted"
    ? format(t.notStarted, { n: attention.n })
    : t[attention.kind];
}

/** Sınıf kartı: ad, düzey, öğrenci sayısı, ödevin mahallesi ve toplam yüzdesi. Öğrenci adı yok. */
function ClassCard({ item }: { item: SchoolClass }) {
  const t = getMessages().school.classCard;
  const tone = item.topic ? toneOf(item.topic.color) : null;
  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-card bg-surface-raised px-3.5 py-3">
      <span className="flex items-baseline justify-between gap-2">
        <b className="font-heading text-[17px]">{item.name}</b>
        <span className="text-xs text-fg-3">
          {item.level
            ? format(t.members, { level: item.level, n: item.members })
            : format(t.membersNoLevel, { n: item.members })}
        </span>
      </span>
      <span className="text-xs text-fg-4">{item.teacher}</span>
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-[9px] text-xs font-bold",
            tone ? cn(tone.chip, tone.text) : "bg-card text-fg-4",
          )}
        >
          {item.topic ? item.topic.name : t.noAssignment}
        </span>
        {item.pct !== null ? (
          <b className="text-sm">{format(t.pct, { pct: item.pct })}</b>
        ) : null}
      </span>
      {item.pct !== null && item.topic && tone ? (
        <span
          role="img"
          aria-label={format(t.progress, {
            topic: item.topic.name,
            pct: item.pct,
          })}
          className="block h-1.5 overflow-hidden rounded-full bg-card"
        >
          <span
            className={cn("block h-full rounded-full", tone.fill)}
            style={{ width: `${item.pct}%` }}
          />
        </span>
      ) : null}
      <span className="text-xs text-fg-3">
        {item.due
          ? format(t.weekDue, { n: item.week, due: item.due })
          : format(t.week, { n: item.week })}
      </span>
      {item.attention ? (
        <span className="flex items-start gap-1.5 text-xs leading-[1.45] text-warning-fg">
          <TriangleAlert
            className="mt-px size-[13px] flex-none"
            strokeWidth={2}
            aria-hidden="true"
          />
          {attentionText(item.attention)}
        </span>
      ) : null}
    </li>
  );
}

/**
 * Öğretmenin ayrıntısı (Okulum-O4-Bulten çekmecesi): masaüstünde sağdan, telefonda alttan açılır.
 * Kurulumun 5 adımı, takılana "Hatırlat" ve sınıfları (pencere: SchoolSheet).
 */
export function TeacherDrawer({
  teacher,
  onClose,
  onRemind,
  children,
}: {
  teacher: SchoolTeacher | null;
  onClose: () => void;
  onRemind: (teacher: SchoolTeacher) => Promise<void>;
  /** Pencere açıkken bildirim kutusu pencerenin içinde çizilir (yoksa perdenin altında kalır). */
  children?: ReactNode;
}) {
  const t = getMessages().school.drawer;
  const [pending, startTransition] = useTransition();
  const meta = !teacher
    ? ""
    : teacher.lastSeen
      ? format(teacher.subject ? t.metaFull : t.lastSeen, {
          subject: teacher.subject,
          when: teacher.lastSeen,
        })
      : teacher.subject;

  return (
    <SchoolSheet
      open={teacher !== null}
      label={teacher ? teacher.name : t.label}
      onClose={onClose}
      extra={children}
    >
      {(close) =>
        teacher ? (
          <>
            <div className="flex items-center gap-3.5">
              <TeacherAvatar emoji={teacher.avatar} size="lg" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <b className="font-heading text-[22px]">{teacher.name}</b>
                {meta ? (
                  <span className="text-[13px] text-fg-3">{meta}</span>
                ) : null}
              </span>
              <SheetClose onClick={close} />
            </div>

            {teacher.reminded ? (
              <span className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success/10 text-sm font-bold text-success-fg">
                <Check
                  className="size-4"
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
                {t.reminded}
              </span>
            ) : teacher.remind ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => onRemind(teacher))}
                className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-warning/45 bg-transparent font-[inherit] text-[15px] font-bold text-warning-fg transition-opacity disabled:cursor-default disabled:opacity-60"
              >
                <Bell
                  className="size-[17px]"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {t.remind[teacher.remind]}
              </button>
            ) : null}

            <section
              aria-label={format(t.setup, { step: teacher.step })}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex items-center justify-between gap-2">
                <b className="text-[15px]">
                  {format(t.setup, { step: teacher.step })}
                </b>
                <SignalChip signal={teacher.signal} />
              </span>
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {t.steps.map((step, i) => {
                  const done = i < teacher.step;
                  return (
                    <li key={step.title} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-7 flex-none items-center justify-center rounded-full border-2 text-xs font-extrabold",
                          done
                            ? cn(
                                signalTone[teacher.signal].border,
                                signalTone[teacher.signal].chip,
                              )
                            : "border-line bg-canvas text-fg-4",
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="flex flex-col gap-px">
                        <b
                          className={cn(
                            "text-sm",
                            done ? "text-fg" : "text-fg-4",
                          )}
                        >
                          {step.title}
                          <span className="sr-only">
                            {done ? t.stepDone : t.stepTodo}
                          </span>
                        </b>
                        <span className="text-xs text-fg-4">
                          {format(step.sub, { n: minStudentsJoined })}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <span className="text-[13px] leading-normal text-fg-2">
                {hintText(teacher.hint)}
              </span>
            </section>

            <section
              aria-labelledby="drawer-classes"
              className="flex flex-col gap-2"
            >
              <span
                id="drawer-classes"
                className="text-xs font-bold tracking-[.8px] text-fg-4"
              >
                {t.classes}
              </span>
              {teacher.classes.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {teacher.classes.map((item) => (
                    <ClassCard key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <span className="rounded-[14px] border border-dashed border-line p-3.5 text-sm text-fg-3">
                  {t.noClasses}
                </span>
              )}
            </section>
            <span className="text-xs text-fg-4">{t.privacy}</span>
          </>
        ) : null
      }
    </SchoolSheet>
  );
}
