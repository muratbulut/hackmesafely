"use client";

import { BookOpenCheck, CalendarDays, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { ProgressRing } from "@/components/roadmap/ProgressRing";
import { format, getMessages } from "@/lib/i18n";
import { classStateOf } from "@/lib/school/bulletin-model";
import { cn } from "@/lib/utils";
import { SchoolSheet, SheetTop } from "./SchoolSheet";
import { classStateTone } from "./SchoolSummary";
import type { ClassAttention, SchoolClass } from "./types";

function Fact({ Icon, value, label }: { Icon: LucideIcon; value: number; label: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5">
      <Icon className="size-[18px] text-fg-3" strokeWidth={2} aria-hidden="true" />
      <b className="font-heading text-[22px] leading-tight">{value}</b>
      <span className="text-xs text-fg-3">{label}</span>
    </span>
  );
}

/** Lejanttaki açıklama "Durum: ..." diye sürer; tek başına cümle olunca ilk harfi büyür. */
function sentence(text: string) {
  return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
}

function attentionText(attention: ClassAttention) {
  const t = getMessages().school.classCard.attention;
  return attention.kind === "notStarted" ? format(t.notStarted, { n: attention.n }) : t[attention.kind];
}

/**
 * Sınıf penceresi: sınıfın durumu, ödevi ve bitme oranı, öğrenci sayısı, bu haftaki odalar ve son
 * tarih. Yalnızca toplamlar; öğrenci adı yoktur. Alttaki düğme sınıfın öğretmeninin penceresini açar.
 */
export function ClassSheet({
  item,
  onClose,
  onOpenTeacher,
  children,
}: {
  item: SchoolClass | null;
  onClose: () => void;
  onOpenTeacher: () => void;
  children?: ReactNode;
}) {
  const t = getMessages().school;
  const s = t.classSheet;
  return (
    <SchoolSheet open={item !== null} label={item ? item.name : s.eyebrow} onClose={onClose} extra={children}>
      {(close) => {
        if (!item) return null;
        const state = classStateOf(item);
        const tone = classStateTone[state];
        const topicTone = item.topic ? toneOf(item.topic.color) : null;
        return (
          <>
            <SheetTop eyebrow={s.eyebrow} onClose={close}>
              <span className="flex flex-wrap items-center gap-2.5">
                <b className="font-heading text-[28px] leading-none">{item.name}</b>
                <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold", tone.soft, tone.text)}>
                  <span aria-hidden="true" className={cn("size-2 rounded-full", tone.fill)} />
                  {t.classStates[state]}
                </span>
              </span>
              <span className="text-sm text-fg-3">
                {item.level ? format(s.meta, { level: item.level, n: item.members, teacher: item.teacher }) : format(s.metaNoLevel, { n: item.members, teacher: item.teacher })}
              </span>
            </SheetTop>

            <div className={cn("flex items-center gap-4 rounded-2xl border p-4", tone.border, tone.soft)}>
              {item.pct !== null && item.topic && topicTone ? (
                <span role="img" aria-label={format(s.ringLabel, { topic: item.topic.name, pct: item.pct })}>
                  <ProgressRing value={item.pct / 100} size={76} stroke={8} strokeClass={topicTone.stroke}>
                    <b className="text-lg">{format(t.classCard.pct, { pct: item.pct })}</b>
                  </ProgressRing>
                </span>
              ) : (
                <span aria-hidden="true" className="flex size-[76px] flex-none items-center justify-center rounded-full border-8 border-line text-lg font-bold text-fg-3">
                  {s.noPct}
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-fg-3">{s.current}</span>
                <b className="text-[17px]">{item.topic ? item.topic.name : s.noAssignment}</b>
                <span className="text-sm text-fg-2">
                  {item.members === 0 ? s.noMembers : item.pct !== null ? format(s.progress, { pct: item.pct }) : s.noProgress}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Fact Icon={Users} value={item.members} label={s.members} />
              <Fact Icon={BookOpenCheck} value={item.week} label={s.week} />
            </div>
            <span className="flex items-center gap-2 text-sm text-fg-2">
              <CalendarDays className="size-4 flex-none text-fg-3" strokeWidth={2} aria-hidden="true" />
              {item.due ?? s.noDue}
            </span>
            {item.attention ? (
              <span className="flex items-start gap-2 text-sm leading-normal text-warning-fg">
                <TriangleAlert className="mt-0.5 size-4 flex-none" strokeWidth={2} aria-hidden="true" />
                {attentionText(item.attention)}
              </span>
            ) : null}

            <section aria-labelledby="class-state" className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
              <h3 id="class-state" className="m-0 text-[15px] font-bold">
                {format(s.stateTitle, { state: t.classStates[state] })}
              </h3>
              <span className="text-sm leading-relaxed text-fg-2">{sentence(t.legend.items[state])}</span>
            </section>

            <button
              type="button"
              onClick={onOpenTeacher}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-accent px-4 font-[inherit] text-sm font-bold text-on-accent transition-[filter] hover:brightness-110"
            >
              {s.openTeacher}
            </button>
          </>
        );
      }}
    </SchoolSheet>
  );
}
