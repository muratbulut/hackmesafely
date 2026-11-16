"use client";

import { BookOpen, CalendarDays, Check, Info, Lock, Swords } from "lucide-react";
import { useId, useMemo, useState, useTransition, type FormEvent } from "react";
import { DistrictGlyph, toneOf, type Tone } from "@/components/roadmap/NeighborhoodIcon";
import { endHomework, giveHomework } from "@/lib/classroom/teacher-actions";
import { dateInputParts, dueShortcuts, labGroups } from "@/lib/classroom/teacher-rules";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { errorText } from "./client";
import { Sheet } from "./Sheet";
import type { ClassroomDetailData, HoodView } from "./types";

type Lab = HoodView["labs"][number];

/**
 * Ödev ver penceresi (hoca öncesi kontrol 33, Murat: B İki sütun). Solda mahalleler (telefonda
 * yatay şerit), sağda odalar (eğitim ve açtığı senaryolar) ve son tarih (hazır kısayollar ya da
 * tarih kutusu), altta özet ve düğme. "Puanlanmaz, sadece kimin bitirdiği görünür." Aynı anda tek
 * ödev: başka mahalle seçilirse açık ödev geçmişe taşınır. Açık ödevin mahallesi seçiliyken odaları
 * ve son tarihi kaydedilir ya da ödev bitirilir. Seçilen odayı açan eğitim kendiliğinden işaretlenir
 * ve kaldırılamaz (15 Ekim, Murat); sunucu aynı kuralı lib/classroom/homework.ts ile yeniden uygular.
 */
export function HomeworkDialog({
  hoodId,
  data,
  onClose,
  onDone,
}: {
  /** Açılınca seçili gelen mahalle; null ise pencere kapalı. */
  hoodId: string | null;
  data: ClassroomDetailData;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const h = getMessages().classroom.detail.homework;
  const titleId = useId();
  return (
    <Sheet
      open={hoodId !== null}
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={h.close}
      className="lg:max-w-[960px]"
      title={
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="m-0 font-heading text-[22px] font-bold break-words">
            {format(h.title, { name: data.name })}
          </h2>
          <p className="m-0 text-[13px] leading-normal text-fg-3">{h.text}</p>
        </div>
      }
    >
      {hoodId !== null ? <HomeworkForm key={hoodId} initialHood={hoodId} data={data} onDone={onDone} /> : null}
    </Sheet>
  );
}

function HomeworkForm({ initialHood, data, onDone }: { initialHood: string; data: ClassroomDetailData; onDone: (message: string) => void }) {
  const t = getMessages().classroom;
  const h = t.detail.homework;
  const ids = { due: useId(), hint: useId() };
  const current = data.homework;
  const [hoodId, setHoodId] = useState(initialHood);
  const [picked, setPicked] = useState(() => initialPick(data, initialHood));
  const [due, setDue] = useState(current && current.neighborhoodId === initialHood ? current.dueInput : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = data.hoods.find((x) => x.id === hoodId) ?? null;
  const same = current !== null && current.neighborhoodId === hoodId;
  const labs = useMemo(() => selected?.labs ?? [], [selected]);
  // Seçili odaları açan eğitimler: işaretli gelir, kaldırılamaz.
  const required = useMemo(() => {
    const gateOf = new Map(labs.map((lab) => [lab.id, lab.gate]));
    const out = new Set<string>();
    for (const id of picked) {
      for (let gate = gateOf.get(id) ?? null; gate && !out.has(gate); gate = gateOf.get(gate) ?? null) out.add(gate);
    }
    return out;
  }, [labs, picked]);
  const chosen = labs.filter((lab) => picked.has(lab.id) || required.has(lab.id));
  const allChosen = labs.length > 0 && chosen.length === labs.length;
  const tone = toneOf(selected?.color ?? "accent");
  // Mahalleler: odası olanlar önce, "Yakında" olanlar sonda.
  const hoods = [...data.hoods.filter((x) => x.labCount > 0), ...data.hoods.filter((x) => x.labCount === 0)];
  const canSubmit = !pending && selected !== null && selected.labCount > 0 && chosen.length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selected || selected.labCount === 0 || pending) return;
    if (chosen.length === 0) {
      setError(t.errors.noRooms);
      return;
    }
    // Tarih kutusu "YYYY-AA-GG" verir; sınırlar aynı biçimde, sözlük sırasıyla karşılaştırılır.
    if (due && (due < data.dueBounds.min || due > data.dueBounds.max)) {
      setError(t.errors.dueDate);
      return;
    }
    startTransition(async () => {
      const result = await giveHomework({ classroomId: data.id, neighborhoodId: selected.id, labIds: chosen.map((lab) => lab.id), due });
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      onDone(result.result === "created" ? format(t.toasts.homeworkGiven, { name: selected.name }) : t.toasts.dueSaved);
    });
  }

  function end() {
    setError(null);
    startTransition(async () => {
      const result = await endHomework({ classroomId: data.id });
      if (result.ok) onDone(t.toasts.homeworkEnded);
      else setError(errorText(result.error));
    });
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0 lg:border-r lg:border-line lg:pr-6">
          <legend className="mb-2 p-0 text-sm font-bold text-fg-2">{h.neighborhoods}</legend>
          {/* Telefonda yatay kaydırılan şerit, masaüstünde dikey liste. */}
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {hoods.map((hood) => (
              <div key={hood.id} className="w-[230px] flex-none lg:w-auto">
                <HoodTile
                  hood={hood}
                  on={hood.id === hoodId}
                  onPick={() => {
                    setHoodId(hood.id);
                    setPicked(initialPick(data, hood.id));
                    setError(null);
                  }}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-5">
          {labs.length > 0 ? (
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="sr-only">{h.rooms}</legend>
              <div className="flex items-center justify-between gap-2">
                <span aria-hidden="true" className="text-sm font-bold text-fg-2">
                  {h.rooms}
                </span>
                <span className="mr-auto text-[13px] text-fg-3" aria-live="polite">
                  {format(h.roomCount, { count: chosen.length })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(allChosen ? new Set() : new Set(labs.map((lab) => lab.id)));
                    setError(null);
                  }}
                  className="h-10 cursor-pointer rounded-[10px] px-2.5 text-[13px] font-bold text-accent-light hover:bg-surface-raised"
                >
                  {allChosen ? h.none : h.all}
                </button>
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {labGroups(labs).map(({ training, scenarios }) => (
                  <li key={training.id} className="flex flex-col gap-1.5">
                    <RoomRow lab={training} tone={tone} locked={required.has(training.id)} on={required.has(training.id) || picked.has(training.id)} onToggle={toggle} />
                    {scenarios.map((lab) => (
                      <RoomRow key={lab.id} lab={lab} tone={tone} indent locked={required.has(lab.id)} on={required.has(lab.id) || picked.has(lab.id)} onToggle={toggle} />
                    ))}
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.due} className="text-sm font-bold text-fg-2">
              {h.due}
            </label>
            <div role="group" aria-label={h.shortcuts.label} className="flex flex-wrap gap-1.5">
              {dueShortcuts(data.dueBounds).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={due === option.value}
                  onClick={() => {
                    setDue(option.value);
                    setError(null);
                  }}
                  className={cn(
                    "h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-bold",
                    due === option.value ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-deep text-fg-2 hover:text-fg",
                  )}
                >
                  {h.shortcuts[option.key]}
                </button>
              ))}
            </div>
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-4" strokeWidth={2} aria-hidden="true" />
              <input
                id={ids.due}
                type="date"
                name="due"
                value={due}
                min={data.dueBounds.min}
                max={data.dueBounds.max}
                onChange={(e) => {
                  setDue(e.target.value);
                  setError(null);
                }}
                aria-describedby={ids.hint}
                className="h-11 w-full rounded-xl border border-line bg-canvas pr-3.5 pl-10 text-base text-fg focus:border-accent focus:outline-none"
              />
            </span>
            <span id={ids.hint} className="text-xs text-fg-3">
              {due ? format(h.dueUntil, { date: dateText(due, "long") }) : h.dueHint}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="m-0 text-[13px] font-medium text-danger-fg">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-5 -mb-6 flex flex-col gap-3 border-t border-line bg-surface px-5 py-4 lg:-mx-7 lg:-mb-7 lg:flex-row lg:flex-wrap lg:items-center lg:px-7">
        {current && !same ? (
          <span className="flex items-start gap-2 text-[13px] text-warning-fg lg:basis-full">
            <Info className="mt-0.5 size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            {format(h.replaces, { name: current.name })}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-3">
          <span aria-hidden="true" className={cn("size-2.5 flex-none rounded-full", tone.fill)} />
          <b className="text-fg">{selected?.name}</b>
          <span>
            {format(h.summary, {
              rooms: chosen.length,
              due: due ? format(h.summaryDue, { date: dateText(due, "short") }) : h.summaryNoDue,
              count: data.students.length,
            })}
          </span>
        </span>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {same ? (
            <button
              type="button"
              onClick={end}
              disabled={pending}
              className="h-10 cursor-pointer rounded-xl px-4 text-sm font-bold text-danger-fg hover:bg-danger/8 disabled:cursor-wait max-lg:order-last"
            >
              {h.end}
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-[50px] cursor-pointer rounded-xl bg-accent px-6 text-base font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? h.saving : same ? h.save : h.give}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Mahalle seçeneği: kutunun tamamı seçilir (radyo düğmesi görünmez). */
function HoodTile({ hood, on, onPick }: { hood: HoodView; on: boolean; onPick: () => void }) {
  const h = getMessages().classroom.detail.homework;
  const tone = toneOf(hood.color);
  const disabled = hood.labCount === 0;
  return (
    <label
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border-[1.5px] px-3.5 py-3 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent",
        on ? cn(tone.border, tone.soft) : "border-line bg-surface-deep",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-line-strong",
      )}
    >
      <input type="radio" name="neighborhood" value={hood.id} checked={on} disabled={disabled} onChange={onPick} className="sr-only" />
      <span className={cn("flex size-9 flex-none items-center justify-center rounded-xl", on ? "bg-surface/60" : tone.soft)}>
        <DistrictGlyph icon={hood.icon} className={cn("size-[18px]", tone.text)} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-[15px]">{hood.name}</b>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-fg-3">
          {disabled ? h.soon : format(h.option, { labs: hood.labCount, pct: hood.pct })}
          {hood.current ? <span className="rounded-full bg-accent px-[6px] py-px text-[10px] font-bold text-on-accent">{h.open}</span> : null}
        </span>
      </span>
      {on ? <Check className={cn("size-5 flex-none", tone.text)} strokeWidth={3} aria-hidden="true" /> : null}
    </label>
  );
}

/** Oda satırı: kendi çizdiğimiz onay kutusu; açan eğitim seçili senaryo varken kilitli. */
function RoomRow({ lab, tone, on, locked, indent, onToggle }: { lab: Lab; tone: Tone; on: boolean; locked: boolean; indent?: boolean; onToggle: (id: string) => void }) {
  const h = getMessages().classroom.detail.homework;
  return (
    <label
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent",
        on ? cn(tone.border, "bg-surface-raised") : "border-line bg-surface-deep",
        locked ? "cursor-not-allowed" : "cursor-pointer",
        indent && "ml-6",
      )}
    >
      <input type="checkbox" checked={on} disabled={locked} onChange={() => onToggle(lab.id)} className="sr-only" />
      <span aria-hidden="true" className={cn("flex size-5 flex-none items-center justify-center rounded-md border-2", on ? cn(tone.fill, "border-transparent text-on-accent") : "border-line-strong")}>
        {on ? <Check className="size-3.5" strokeWidth={3.5} /> : null}
      </span>
      {lab.training ? (
        <BookOpen className={cn("size-4 flex-none", tone.text)} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Swords className="size-4 flex-none text-fg-3" strokeWidth={2} aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold break-words">{lab.name}</span>
        <span className="text-xs text-fg-3">{locked ? h.required : !lab.training ? h.scenario : lab.gate === null ? h.basic : h.training}</span>
      </span>
      {locked ? <Lock className="size-3.5 flex-none text-fg-4" strokeWidth={2} aria-hidden="true" /> : null}
    </label>
  );
}

/** Tarih kutusundaki gün metin olarak: "20 Kasım Perşembe" ya da "20 Kasım". */
function dateText(input: string, kind: "long" | "short"): string {
  const h = getMessages().classroom.detail.homework;
  const { day, month, weekday } = dateInputParts(input);
  return kind === "long" ? format(h.dateLong, { day, month: h.months[month], weekday: h.weekdays[weekday] }) : format(h.dateShort, { day, month: h.months[month] });
}

/** Pencere açılınca ya da mahalle değişince seçili odalar: açık ödevin mahallesiyse ödevin odaları, değilse hepsi. */
function initialPick(data: ClassroomDetailData, hoodId: string): Set<string> {
  const hood: HoodView | undefined = data.hoods.find((x) => x.id === hoodId);
  if (data.homework && data.homework.neighborhoodId === hoodId) return new Set(data.homework.labs.map((lab) => lab.id));
  return new Set(hood?.labs.map((lab) => lab.id) ?? []);
}
