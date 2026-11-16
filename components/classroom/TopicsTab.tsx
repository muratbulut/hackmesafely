import { BookOpen, CalendarDays, ClipboardList, History, Swords } from "lucide-react";
import { DistrictGlyph, NeighborhoodIcon, NeighborhoodWatermark, toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { ProgressRing } from "@/components/roadmap/ProgressRing";
import { labGroups, neighborhoodSplit } from "@/lib/classroom/teacher-rules";
import { format, getMessages, rich } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./parts";
import type { ClassroomDetailData, HoodView } from "./types";

/**
 * Sınıf detayı > Konular (hoca öncesi kontrol 33, Murat: A Mahalle kartları). Odası olan her
 * mahalle bir kart: sınıfın bitirme yüzdesi, eğitimler ve açtıkları senaryolar, kaç öğrencinin
 * hepsini bitirdiği, başladığı ya da hiç girmediği ve "Ödev ver" (açık ödevde "düzenle"). Odası
 * olmayan mahalle "%0" ile geride kalmış gibi görünmesin diye altta "Yakında" olarak durur.
 * Altta geçmiş ödevler. Aynı anda tek ödev.
 */
export function TopicsTab({ data, onGive }: { data: ClassroomDetailData; onGive: (hoodId: string) => void }) {
  const t = getMessages().classroom;
  const tp = t.detail.topics;
  const live = data.hoods.map((hood, index) => ({ hood, index })).filter(({ hood }) => hood.labCount > 0);
  const soon = data.hoods.filter((hood) => hood.labCount === 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] text-fg-3">{tp.note}</p>
      <ul className="m-0 grid list-none grid-cols-1 gap-3.5 p-0 lg:grid-cols-2 lg:gap-4">
        {live.map(({ hood, index }) => {
          const tone = toneOf(hood.color);
          const split = neighborhoodSplit(
            data.students.map((s) => s.byHood[index] ?? 0),
            hood.labCount,
          );
          const trainings = hood.labs.filter((lab) => lab.training).length;
          return (
            <li
              key={hood.id}
              data-hood=""
              aria-labelledby={`topic-${hood.id}`}
              className={cn("relative flex flex-col gap-3.5 overflow-hidden rounded-[22px] border bg-surface p-4 lg:p-5", hood.current ? tone.border : "border-line")}
            >
              <NeighborhoodWatermark icon={hood.icon} color={hood.color} />
              <span aria-hidden="true" className={cn("pointer-events-none absolute -top-20 -left-16 size-56 rounded-full blur-3xl", tone.glow)} />
              <div className="relative flex items-center gap-3.5">
                <NeighborhoodIcon icon={hood.icon} color={hood.color} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b id={`topic-${hood.id}`} className="text-[17px]">
                      {hood.name}
                    </b>
                    {hood.current ? <span className="rounded-full bg-accent px-[7px] py-0.5 text-[10px] font-bold text-on-accent">{tp.current}</span> : null}
                  </span>
                  <span className="text-xs text-fg-3">{format(tp.kinds, { trainings, scenarios: hood.labs.length - trainings })}</span>
                </span>
                <ProgressRing value={hood.pct / 100} size={58} stroke={6} strokeClass={tone.stroke}>
                  <b className="text-sm">{format(t.pct, { pct: hood.pct })}</b>
                </ProgressRing>
              </div>
              <div className="relative rounded-2xl border border-card bg-surface-raised/80 p-3.5">
                <RoomTree hood={hood} />
              </div>
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-3">
                  <span>{rich(format(tp.splitAll, { count: split.all }), { b: (chunk) => <b className="text-success-fg">{chunk}</b> })}</span>
                  <span>{rich(format(tp.splitSome, { count: split.some }), { b: (chunk) => <b className="text-fg-2">{chunk}</b> })}</span>
                  <span>{rich(format(tp.splitNone, { count: split.none }), { b: (chunk) => <b className="text-warning-fg">{chunk}</b> })}</span>
                </span>
                {hood.current ? (
                  <button
                    type="button"
                    onClick={() => onGive(hood.id)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3.5 text-[13px] font-bold text-accent-fg"
                  >
                    <CalendarDays className="size-4" strokeWidth={2} aria-hidden="true" />
                    {tp.edit}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGive(hood.id)}
                    aria-label={format(tp.giveOf, { name: hood.name })}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-3.5 text-[13px] font-bold text-on-accent"
                  >
                    <ClipboardList className="size-4" strokeWidth={2} aria-hidden="true" />
                    {tp.give}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {soon.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>{tp.soonTitle}</Eyebrow>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {soon.map((hood) => (
              <li
                key={hood.id}
                data-hood=""
                data-soon=""
                className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-dashed border-line px-3.5 text-sm text-fg-3 opacity-80"
              >
                <DistrictGlyph icon={hood.icon} className={cn("size-4 flex-none", toneOf(hood.color).text)} strokeWidth={2} aria-hidden="true" />
                {hood.name}
                <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] font-bold">{tp.soon}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.past.length > 0 ? (
        <section aria-labelledby="past-homework-title" className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-4 lg:p-5">
          <h3 id="past-homework-title" className="m-0 flex items-center gap-2 text-[15px] font-bold">
            <History className="size-4 text-fg-3" strokeWidth={2} aria-hidden="true" />
            {tp.past}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {data.past.map((p) => {
              const tone = toneOf(p.color);
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <span aria-hidden="true" className={cn("size-2.5 flex-none rounded-full", tone.fill)} />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span aria-hidden="true" className="block h-1.5 w-24 flex-none overflow-hidden rounded-full bg-card">
                    <span className={cn("block h-full rounded-full", tone.fill)} style={{ width: `${p.pct}%` }} />
                  </span>
                  <b className="w-10 flex-none text-right text-[13px]">{format(t.pct, { pct: p.pct })}</b>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Mahallenin odaları: her eğitim ve altında girintili, onun açtığı senaryolar. */
function RoomTree({ hood }: { hood: HoodView }) {
  const tp = getMessages().classroom.detail.topics;
  const tone = toneOf(hood.color);
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {labGroups(hood.labs).map(({ training, scenarios }) => (
        <li key={training.id} className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2.5">
            <span className={cn("flex size-7 flex-none items-center justify-center rounded-lg", tone.soft)}>
              <BookOpen className={cn("size-3.5", tone.text)} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-bold break-words">{training.name}</span>
            <span className="flex-none text-[11px] text-fg-4">{training.gate === null ? tp.basic : tp.training}</span>
          </span>
          {scenarios.length > 0 ? (
            <ul className="m-0 ml-[13px] flex list-none flex-col gap-1.5 border-l-2 border-line-strong py-0.5 pl-4">
              {scenarios.map((lab) => (
                <li key={lab.id} className="flex items-center gap-2.5">
                  <span className="flex size-6 flex-none items-center justify-center rounded-md bg-card">
                    <Swords className="size-3 text-fg-3" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-xs break-words text-fg-2">{lab.name}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
