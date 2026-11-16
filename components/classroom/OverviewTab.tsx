import { ArrowRight, CalendarDays, CheckCheck, CircleCheck, ClipboardList, Lock, Presentation, TrendingUp, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { EmptyState } from "@/components/status/EmptyState";
import { minFinishedForRate } from "@/lib/classroom/rules";
import { attentionRules, averageNotice, dateInputParts, percent, statusCounts, type StudentStatus } from "@/lib/classroom/teacher-rules";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card, Donut, Eyebrow, Initial, statusFg, statusFill, statusStroke } from "./parts";
import { SummaryBox } from "./SummaryBox";
import type { ClassroomDetailData, HomeworkLabView, HomeworkView } from "./types";

/** Tuzağı fark eden yüzdesi: "zor geçiyor" sınırının altı sarı, üstü yeşil. */
const rateTone = (rate: number) => (rate < attentionRules.hardLabBelowRate ? "text-warning-fg" : "text-success-fg");
const panoStatuses: StudentStatus[] = ["finished", "inProgress", "notStarted"];
/** Pano'nun iki satırı aynı sütunlarla bölünür; alt kutular üsttekilerle hizalı (Murat, 16 Kasım). */
const panoGrid = "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5";

/**
 * Sınıf detayı > Genel bakış. Açık ödev ve öğrenci varken Pano (hoca öncesi kontrol 33, Murat: A):
 * ödevin halkası ve durum satırları (dokununca Öğrenciler o durumla açılır), dört kutu, ödevin
 * odaları (bitiren sayısı, tuzağı fark edenlerin ilk ve son denemedeki oranı), ödeve başlamayanlar
 * ve hızlı işlemler. Oranlar sınıf toplamıdır ve en az 5 öğrenci bitirince görünür; öğrencinin
 * puanı ya da raporu hiçbir yerde yok. Ödev ya da öğrenci yoksa kısa özet ve boş hâl.
 */
export function OverviewTab({
  data,
  onOpenStudent,
  onGiveHomework,
  onProject,
  onShowStudents,
}: {
  data: ClassroomDetailData;
  onOpenStudent: (id: string) => void;
  onGiveHomework: (hoodId?: string) => void;
  onProject: () => void;
  onShowStudents: (status?: StudentStatus) => void;
}) {
  const t = getMessages().classroom;
  const o = t.detail.overview;
  const hw = data.homework;
  const members = data.students.length;

  if (hw && members > 0) {
    return <Pano data={data} hw={hw} onOpenStudent={onOpenStudent} onGiveHomework={onGiveHomework} onProject={onProject} onShowStudents={onShowStudents} />;
  }

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        <SummaryBox compact Icon={Users} tone="accent" value={members} label={o.students} />
        <SummaryBox compact Icon={CircleCheck} tone="success" value={hw ? format(t.doneOf, { done: hw.finished, total: members }) : o.noValue} label={o.completed} />
        <SummaryBox compact Icon={CheckCheck} tone="purple" value={data.week} label={o.week} />
      </div>
      {members === 0 ? (
        <EmptyState
          Icon={Users}
          title={o.noStudentsTitle}
          className="bg-surface py-8"
          action={
            <button
              type="button"
              onClick={onProject}
              className="mt-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-on-accent"
            >
              <Presentation className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              {t.detail.projectCode}
            </button>
          }
        >
          {o.noStudentsText}
        </EmptyState>
      ) : (
        <EmptyState
          Icon={ClipboardList}
          title={o.noHomeworkTitle}
          className="bg-surface py-8"
          action={
            <button
              type="button"
              onClick={() => onGiveHomework()}
              className="mt-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-on-accent"
            >
              <ClipboardList className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              {t.detail.giveHomework}
            </button>
          }
        >
          {o.noHomeworkText}
        </EmptyState>
      )}
    </div>
  );
}

function Pano({
  data,
  hw,
  onOpenStudent,
  onGiveHomework,
  onProject,
  onShowStudents,
}: {
  data: ClassroomDetailData;
  hw: HomeworkView;
  onOpenStudent: (id: string) => void;
  onGiveHomework: (hoodId?: string) => void;
  onProject: () => void;
  onShowStudents: (status?: StudentStatus) => void;
}) {
  const m = getMessages().classroom;
  const o = m.detail.overview;
  const h = m.detail.homework;
  const members = data.students.length;
  const tone = toneOf(hw.color);
  const counts = statusCounts(data.students.map((s) => s.status));
  const notice = averageNotice(hw.labs.map((lab) => lab.noticed));
  const dueDate = hw.dueInput ? dateInputParts(hw.dueInput) : null;
  const editHomework = () => onGiveHomework(hw.neighborhoodId);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={panoGrid}>
        <Card aria-labelledby="homework-pano-title" className="lg:p-6">
          <span aria-hidden="true" className={cn("pointer-events-none absolute -top-24 -left-20 size-64 rounded-full blur-3xl", tone.glow)} />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Eyebrow>{o.eyebrow}</Eyebrow>
              <span className="flex flex-wrap items-center gap-2">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", tone.fill)} />
                <h2 id="homework-pano-title" className="m-0 font-heading text-[22px] font-bold break-words">
                  {hw.name}
                </h2>
                <span className="text-[13px] text-fg-3">{format(m.detail.band.labs, { count: hw.labs.length })}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={editHomework}
              className={cn(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[13px] font-bold",
                hw.overdue ? "border-warning/50 bg-warning/10 text-warning-fg" : "border-line bg-surface-raised text-fg-2 hover:text-fg",
              )}
            >
              <CalendarDays className="size-4 flex-none" strokeWidth={2} aria-hidden="true" />
              {hw.due ? format(m.pair, { a: hw.due, b: hw.left ?? "" }) : o.noDue}
            </button>
          </div>
          <div className="relative flex flex-col items-center gap-5 pt-2 sm:flex-row sm:gap-8">
            <Donut
              size={168}
              stroke={18}
              label={format(m.finishedLabel, { done: hw.finished, total: members })}
              parts={panoStatuses.map((k) => ({ value: counts[k], className: statusStroke[k] }))}
            >
              <b className="font-heading text-[34px] leading-none">
                {hw.finished}
                <span className="text-lg text-fg-3">{format(m.ofTotal, { total: members })}</span>
              </b>
              <span className="mt-1 text-xs text-fg-3">{o.finishedShort}</span>
            </Donut>
            <ul className="m-0 flex w-full list-none flex-col gap-2 p-0">
              {panoStatuses.map((k) => {
                const share = percent(counts[k], members);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => onShowStudents(k)}
                      aria-label={format(o.statusRow, { label: m.detail.students.filters[k], count: counts[k], pct: share })}
                      className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-[14px] border border-card bg-surface-raised px-3.5 text-left hover:border-line-strong"
                    >
                      <span aria-hidden="true" className={cn("size-3 flex-none rounded-[4px]", statusFill[k])} />
                      <span className="flex-1 text-sm font-bold">{m.detail.students.filters[k]}</span>
                      <b className={cn("font-heading text-xl", statusFg[k])}>{counts[k]}</b>
                      <span className="w-10 text-right text-xs text-fg-4">{format(m.pct, { pct: share })}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Stat Icon={Users} tone="bg-accent/12 text-accent-fg" value={members} label={o.students} />
          <Stat Icon={CheckCheck} tone="bg-purple/12 text-purple-fg" value={data.week} label={o.week} />
          <Stat
            Icon={CalendarDays}
            tone={hw.overdue ? "bg-warning/14 text-warning-fg" : "bg-success/12 text-success-fg"}
            value={hw.left ?? o.leftNone}
            label={dueDate ? format(o.dueOn, { date: format(h.dateShort, { day: dueDate.day, month: h.months[dueDate.month] }) }) : o.noDueLabel}
            small
          />
          <Stat
            Icon={TrendingUp}
            tone="bg-success/12 text-success-fg"
            value={notice ? format(m.pct, { pct: notice.last }) : o.noValue}
            label={notice ? format(o.notice, { first: notice.first }) : format(o.noticeHidden, { min: minFinishedForRate })}
          />
        </div>
      </div>

      <div className={panoGrid}>
        <Card aria-labelledby="homework-labs-title" className="lg:p-6">
          <h3 id="homework-labs-title" className="m-0 text-base font-bold">
            {o.labsTitle}
          </h3>
          {hw.labs.length === 0 ? (
            <p className="m-0 rounded-2xl border border-dashed border-line p-4 text-sm text-fg-3">{o.noLabs}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {hw.labs.map((lab, i) => (
                <li key={lab.id} className="flex flex-col gap-2 rounded-2xl border border-card bg-surface-raised px-4 py-3.5">
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className={cn("flex size-7 flex-none items-center justify-center rounded-lg text-xs font-bold", tone.soft, tone.text)}>
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="text-[15px] break-words">{lab.name}</b>
                      <span className="text-xs text-fg-3">{lab.training ? o.trainingRoom : o.scenarioRoom}</span>
                    </span>
                    <b className="flex-none font-heading text-lg">
                      <span aria-hidden="true">
                        {lab.finishers}
                        <span className="text-sm text-fg-3">{format(m.ofTotal, { total: members })}</span>
                      </span>
                      <span className="sr-only">{format(o.finishersLabel, { done: lab.finishers, total: members })}</span>
                    </b>
                  </span>
                  <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-card">
                    <span className={cn("block h-full rounded-full", tone.fill)} style={{ width: `${percent(lab.finishers, members)}%` }} />
                  </span>
                  <NoticeLine lab={lab} />
                </li>
              ))}
            </ol>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          {hw.notStarted.length > 0 ? (
            <Card aria-labelledby="not-started-title" className="border-warning/30">
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-warning/10 blur-3xl" />
              <h3 id="not-started-title" className="relative m-0 flex items-center gap-2 text-[15px] font-bold">
                <TriangleAlert className="size-4 flex-none text-warning-fg" strokeWidth={2} aria-hidden="true" />
                {format(o.notStarted, { count: hw.notStarted.length })}
              </h3>
              <ul className="relative m-0 flex list-none flex-wrap gap-1.5 p-0">
                {hw.notStarted.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onOpenStudent(s.id)}
                      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface-deep pr-3.5 pl-1 text-[13px] text-fg hover:border-accent"
                    >
                      <Initial name={s.name} className="size-8 text-xs" />
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="relative m-0 text-xs text-fg-4">{o.notStartedNote}</p>
            </Card>
          ) : (
            <p className="m-0 flex items-center gap-2 rounded-[20px] border border-success/30 bg-surface p-4 text-[15px] font-bold lg:p-5">
              <CircleCheck className="size-4 flex-none text-success-fg" strokeWidth={2} aria-hidden="true" />
              {o.allStarted}
            </p>
          )}
          <Card aria-labelledby="quick-actions-title">
            <h3 id="quick-actions-title" className="m-0 text-[15px] font-bold">
              {o.quick.title}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <QuickButton Icon={Presentation} label={m.detail.projectCode} onClick={onProject} />
              <QuickButton Icon={CalendarDays} label={o.quick.edit} onClick={editHomework} />
              <QuickButton Icon={Users} label={o.quick.students} onClick={() => onShowStudents()} />
            </div>
          </Card>
          <p className="m-0 flex items-start gap-2.5 rounded-[14px] border border-card bg-surface-raised px-3.5 py-3 text-[13px] leading-normal text-fg-3 lg:mt-auto">
            <Lock className="mt-0.5 size-4 flex-none text-accent-light" strokeWidth={2} aria-hidden="true" />
            <span>{format(o.privacy, { min: minFinishedForRate })}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Odanın tuzak satırı: eğitimde açıklama, az bitirende bekleme notu, yoksa ilk ve son denemedeki oran. */
function NoticeLine({ lab }: { lab: HomeworkLabView }) {
  const o = getMessages().classroom.detail.overview;
  if (lab.training) return <span className="text-xs text-fg-4">{o.training}</span>;
  if (!lab.noticed) return <span className="text-xs text-fg-4">{format(o.noticedHidden, { min: minFinishedForRate })}</span>;
  const { first, last } = lab.noticed;
  const gain = last - first;
  return (
    <span className="text-[13px] text-fg-3">
      <span aria-hidden="true" className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {o.noticedLead}
        <b className={rateTone(first)}>{format(o.noticedFirst, { first })}</b>
        <ArrowRight className="size-3.5 text-fg-4" strokeWidth={2} />
        <b className={rateTone(last)}>{format(o.noticedLast, { last })}</b>
        {gain > 0 ? <span className="rounded-full bg-success/14 px-1.5 py-0.5 text-[11px] font-bold text-success-fg">{format(o.noticedGain, { gain })}</span> : null}
      </span>
      <span className="sr-only">{format(o.noticedLabel, { first, last })}</span>
    </span>
  );
}

function QuickButton({ Icon, label, onClick }: { Icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-card bg-surface-raised px-3 text-[13px] font-bold text-fg hover:border-line-strong"
    >
      <Icon className="size-4 text-accent-light" strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
}

function Stat({ Icon, tone, value, label, small }: { Icon: LucideIcon; tone: string; value: ReactNode; label: string; small?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3.5 lg:p-[18px]">
      <span className={cn("flex size-9 items-center justify-center rounded-xl lg:size-10", tone)}>
        <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </span>
      <b className={cn("font-heading leading-[1.1] break-words", small ? "text-lg lg:text-xl" : "text-2xl lg:text-[30px]")}>{value}</b>
      <span className="text-xs leading-snug text-fg-3">{label}</span>
    </div>
  );
}
