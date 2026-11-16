import { ArrowDown, ArrowUp, CheckCircle2, Minus, Sparkles, TriangleAlert } from "lucide-react";
import { format, getMessages, rich } from "@/lib/i18n";
import { classStateCounts, classStates, schoolStateOf, type ClassState, type SchoolState } from "@/lib/school/bulletin-model";
import { cn } from "@/lib/utils";
import type { SchoolClass, SchoolView } from "./types";

/** Sınıf durumlarının renkleri: Dikkat sarı, Yolda camgöbeği, İyi gidiyor yeşil, Ödev yok gri. */
export const classStateTone: Record<ClassState, { fill: string; soft: string; text: string; border: string }> = {
  stuck: { fill: "bg-warning", soft: "bg-warning/12", text: "text-warning-fg", border: "border-warning/40" },
  onTrack: { fill: "bg-accent", soft: "bg-accent/12", text: "text-accent-fg", border: "border-accent/40" },
  good: { fill: "bg-success", soft: "bg-success/12", text: "text-success-fg", border: "border-success/40" },
  none: { fill: "bg-line", soft: "bg-card", text: "text-fg-3", border: "border-line" },
};

const schoolTone: Record<SchoolState, { box: string; Icon: typeof CheckCircle2 }> = {
  good: { box: "bg-success/12 text-success-fg", Icon: CheckCircle2 },
  onTrack: { box: "bg-warning/12 text-warning-fg", Icon: TriangleAlert },
  start: { box: "bg-accent/12 text-accent-fg", Icon: Sparkles },
};

/** "geçen haftadan 1 az": bu haftanın bitirilen odası geçen haftayla karşılaştırılır. */
export function WeekTrend({ chart }: { chart: SchoolView["bulletin"]["chart"] }) {
  const t = getMessages().school.summary.trend;
  const diff = chart.length >= 2 ? chart[chart.length - 1].count - chart[chart.length - 2].count : 0;
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-bold", diff > 0 ? "text-success-fg" : diff < 0 ? "text-warning-fg" : "text-fg-3")}>
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      {diff === 0 ? t.same : format(diff > 0 ? t.up : t.down, { n: Math.abs(diff) })}
    </span>
  );
}

/**
 * Üst özet (hoca öncesi kontrol 34, "E Karne + pano"): okulun tek cümlesi ("Okulunuz yolda, birkaç
 * yer ilgi istiyor"), haftanın sayıları ve yanında sınıfların dört durumu. Hepsi toplam sayıdır.
 */
export function SchoolSummary({ view, classes }: { view: SchoolView; classes: SchoolClass[] }) {
  const t = getMessages().school;
  const b = view.bulletin;
  const state = schoolStateOf({ classes, stuckTeachers: view.teachers.filter((x) => !x.me && x.signal === "stuck").length });
  const counts = classStateCounts(classes);
  const { box, Icon } = schoolTone[state];
  return (
    <section
      aria-labelledby="school-summary"
      className="grid grid-cols-1 gap-4 rounded-[24px] border border-line bg-[linear-gradient(180deg,var(--surface),var(--surface-raised))] p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-8 lg:p-8 print:hidden"
    >
      <div className="flex items-start gap-3.5 lg:gap-6">
        <span aria-hidden="true" className={cn("flex size-12 flex-none items-center justify-center rounded-2xl lg:size-[72px]", box)}>
          <Icon className="size-7 lg:size-10" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[1.5px] text-fg-3">{format(t.summary.week, { range: b.range })}</span>
          <h2 id="school-summary" className="m-0 font-heading text-[22px] leading-tight font-bold lg:text-[32px]">
            {t.summary.states[state]}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-fg-2">
            {rich(format(t.summary.line, { teachers: b.counts.teachers, classes: b.counts.classes, students: b.counts.students, n: b.counts.weekDone }), {
              b: (chunk) => <b className="text-fg">{chunk}</b>,
            })}
          </p>
          <WeekTrend chart={b.chart} />
        </span>
      </div>
      <ul aria-label={t.summary.countsLabel} className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
        {classStates.map((k) => (
          <li key={k} className={cn("flex items-center gap-3 rounded-[18px] border bg-surface p-3.5", classStateTone[k].border)}>
            <span aria-hidden="true" className={cn("size-4 flex-none rounded-[5px]", classStateTone[k].fill)} />
            <span className="flex flex-col">
              <b className="font-heading text-[26px] leading-none lg:text-[30px]">{counts[k]}</b>
              <span className="text-xs text-fg-3">{format(t.summary.count, { state: t.classStates[k].toLocaleLowerCase("tr") })}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
