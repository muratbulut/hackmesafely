"use client";

import { ChevronRight, CircleDashed } from "lucide-react";
import { format, getMessages } from "@/lib/i18n";
import { classStateOf, classStates } from "@/lib/school/bulletin-model";
import { cn } from "@/lib/utils";
import { classStateTone, WeekTrend } from "./SchoolSummary";
import { SignalChip, TeacherAvatar } from "./TeacherList";
import type { SchoolClass, SchoolTeacher, SchoolView } from "./types";

/** Sınıfın renkli kutusu: adı, ödevin yüzdesi, mahallesi ve öğrenci sayısı. Dokununca sınıf penceresi. */
function ClassTile({ item, onOpen }: { item: SchoolClass; onOpen: (id: string) => void }) {
  const t = getMessages().school;
  const state = classStateOf(item);
  const tone = classStateTone[state];
  const detail = item.members === 0 ? t.board.tileNoMembers : item.topic ? item.topic.name : t.board.tileNoAssignment;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-haspopup="dialog"
        aria-label={format(t.board.tileLabel, { name: item.name, state: t.classStates[state] })}
        className={cn(
          "flex min-h-16 min-w-[140px] cursor-pointer flex-col justify-center gap-1 rounded-2xl border px-3.5 py-2 text-left font-[inherit] text-fg transition-[filter] hover:brightness-125",
          tone.border,
          tone.soft,
        )}
      >
        <span className="flex items-center justify-between gap-3">
          <b className="font-heading text-[17px]">{item.name}</b>
          <b className={cn("text-sm", tone.text)}>{item.pct !== null ? format(t.classCard.pct, { pct: item.pct }) : t.classSheet.noPct}</b>
        </span>
        <span className="max-w-[220px] truncate text-xs text-fg-3">{format(t.board.tile, { topic: detail, n: item.members })}</span>
      </button>
    </li>
  );
}

/**
 * Öğretmenler ve sınıfları (Sınıf panosu): her öğretmen bir satır, sınıfları durumunun renginde
 * kutular. Öğretmene dokununca öğretmenin, sınıfa dokununca sınıfın penceresi açılır.
 */
export function SchoolBoard({
  teachers,
  onOpenTeacher,
  onOpenClass,
}: {
  teachers: SchoolTeacher[];
  onOpenTeacher: (id: string) => void;
  onOpenClass: (id: string) => void;
}) {
  const t = getMessages().school;
  return (
    <section aria-labelledby="school-board" className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3.5 lg:px-6">
        <h2 id="school-board" className="m-0 font-heading text-lg font-bold">
          {t.board.title}
        </h2>
        <span className="text-xs text-fg-3">{t.board.hint}</span>
      </div>
      {teachers.length === 0 ? (
        <p className="m-0 px-4 py-5 text-sm text-fg-3 lg:px-6">{t.teachers.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {teachers.map((teacher) => (
            <li
              key={teacher.id}
              aria-label={teacher.name}
              className="flex flex-col gap-3 border-b border-card px-4 py-4 last:border-0 lg:flex-row lg:items-center lg:gap-6 lg:px-6"
            >
              <button
                type="button"
                onClick={() => onOpenTeacher(teacher.id)}
                aria-haspopup="dialog"
                className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-[inherit] text-fg lg:w-[280px] lg:flex-none"
              >
                <TeacherAvatar emoji={teacher.avatar} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <b className="truncate text-[15px]">{teacher.name}</b>
                    {teacher.me ? <span className="flex-none rounded-[5px] bg-card px-1.5 py-0.5 text-[10px] font-extrabold tracking-[.6px] text-accent-fg">{t.teachers.me}</span> : null}
                  </span>
                  {teacher.subject ? <span className="truncate text-xs text-fg-3">{teacher.subject}</span> : null}
                </span>
                <span className="lg:hidden">
                  <SignalChip signal={teacher.signal} />
                </span>
                <ChevronRight className="size-4 flex-none text-fg-4" strokeWidth={2} aria-hidden="true" />
              </button>
              {teacher.classes.length > 0 ? (
                <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-2 p-0">
                  {teacher.classes.map((item) => (
                    <ClassTile key={item.id} item={item} onOpen={onOpenClass} />
                  ))}
                </ul>
              ) : (
                <span className="flex min-h-16 flex-1 items-center gap-2 self-start rounded-2xl border border-dashed border-warning/40 px-4 text-sm text-warning-fg lg:flex-none">
                  <CircleDashed className="size-4 flex-none" strokeWidth={2} aria-hidden="true" />
                  {t.board.noClass}
                </span>
              )}
              <span className="hidden flex-none lg:ml-auto lg:block">
                <SignalChip signal={teacher.signal} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Haftanın grafiği: son 5 haftada bitirilen oda sayıları, bu hafta vurgulu. */
export function WeekCard({ bulletin }: { bulletin: SchoolView["bulletin"] }) {
  const t = getMessages().school;
  const max = Math.max(1, ...bulletin.chart.map((w) => w.count));
  const label = format(t.bulletin.chartLabel, {
    n: bulletin.chart.length,
    list: bulletin.chart.map((w) => format(t.bulletin.chartItem, { week: w.label, n: w.count })).join(", "),
  });
  return (
    <section aria-labelledby="school-week" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 lg:p-6 print:hidden">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="school-week" className="m-0 text-base font-bold">
          {format(t.week.title, { n: bulletin.counts.weekDone })}
        </h2>
        <WeekTrend chart={bulletin.chart} />
      </span>
      <span className="-mt-1 text-xs text-fg-3">{format(t.week.sub, { n: bulletin.chart.length })}</span>
      <div role="img" aria-label={label} className="flex h-[110px] gap-2.5">
        {bulletin.chart.map((w) => (
          <span key={w.label} aria-hidden="true" className="flex h-full flex-1 flex-col items-center gap-1.5">
            <span className={cn("text-xs font-bold", w.current ? "text-fg" : "text-fg-3")}>{w.count}</span>
            <span className="flex w-full flex-1 items-end">
              <span
                className={cn("block w-full rounded-t-lg rounded-b-[3px]", w.current ? "bg-accent" : "bg-line")}
                style={{ height: `${Math.max(4, Math.round((w.count / max) * 100))}%` }}
              />
            </span>
            <span className="text-[11px] whitespace-nowrap text-fg-4">{w.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/** "Renkler ne demek?": dört durumun tek cümlelik açıklaması. */
export function LegendCard() {
  const t = getMessages().school;
  return (
    <section aria-labelledby="school-legend" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 lg:p-6 print:hidden">
      <h2 id="school-legend" className="m-0 text-base font-bold">
        {t.legend.title}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm leading-snug text-fg-2">
        {classStates.map((k) => (
          <li key={k} className="flex items-start gap-3">
            <span aria-hidden="true" className={cn("mt-px size-4 flex-none rounded-[5px]", classStateTone[k].fill)} />
            <span>
              <b className={classStateTone[k].text}>{format(t.legend.term, { state: t.classStates[k] })}</b> {t.legend.items[k]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
