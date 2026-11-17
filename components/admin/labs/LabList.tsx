"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, Eye, EyeOff, HelpCircle, Lock, Mail, MessageSquare, Play, Send } from "lucide-react";
import { DistrictGlyph, toneOf } from "@/components/roadmap/NeighborhoodIcon";
import type { LabStatus, SceneTemplate } from "@/lib/generated/prisma/enums";
import type { AdminLabRow, AdminNeighborhood } from "@/lib/admin/lab-data";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { statusColors } from "../colors";
import { useLabActions } from "./useLabActions";

const statuses: LabStatus[] = ["PUBLISHED", "DRAFT", "HIDDEN"];
const thousands = (n: number) => n.toLocaleString("tr-TR");
/** Bu yüzde ve üstü yeşil, altı sarı. */
const noticedGoodFrom = 60;
const sceneIcon: Record<SceneTemplate, typeof Mail> = { TRAINING: BookOpen, INBOX: Mail, MESSAGING: MessageSquare };

/**
 * Masaüstünde her satır aynı sütunlara oturur: sıra okları, oda, durum, bitiren, fark eden,
 * düğmeler (39 R1.3, 17 Kasım, Murat: "hizalı olsun").
 */
const columns = "lg:grid lg:grid-cols-[76px_minmax(0,1fr)_104px_112px_112px_236px] lg:items-center lg:gap-x-4";

/** Mahallenin eğitimleri, her birinin altında açtığı senaryolar (listede rota sırası). */
type Block = { training: AdminLabRow | null; scenarios: AdminLabRow[] };

function blocksOf(labs: AdminLabRow[]): Block[] {
  const blocks: Block[] = [];
  for (const row of labs) {
    if (row.type === "TRAINING") blocks.push({ training: row, scenarios: [] });
    else if (blocks.length) blocks[blocks.length - 1].scenarios.push(row);
    else blocks.push({ training: null, scenarios: [row] });
  }
  return blocks;
}

/**
 * Odalar (39 R1.3 "Numaralı ve katlanır", 17 Kasım, Murat): üstte durum kutuları (süzgeç), altta
 * mahalle mahalle numaralı liste. Eğitim 1, 2; senaryoları kendi eğitiminin altında içeriden 1.1,
 * 1.2. Eğitim satırı senaryolarını katlar. Soldaki oklar odayı kendi grubunda bir üste ya da alta
 * taşır ve hemen kaydeder ("Geri al" ile). Oda içeriği burada yazılmaz: oda depodaki dosyadadır.
 * Öğrenci adı yok, yalnızca toplamlar.
 */
export function LabList({ neighborhoods, canPublish }: { neighborhoods: AdminNeighborhood[]; canPublish: boolean }) {
  const t = getMessages().admin;
  const l = t.list;
  const [filter, setFilter] = useState<LabStatus | null>(null);
  const [closed, setClosed] = useState<string[]>([]);
  const actions = useLabActions();
  const all = neighborhoods.flatMap((n) => n.labs);
  const count = (status: LabStatus, rows = all) => rows.filter((r) => r.status === status).length;
  const toggleBlock = (id: string) => setClosed((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <main className="flex flex-col gap-[18px] px-4 pt-5 pb-16 lg:gap-[22px] lg:px-9 lg:pt-8 lg:pb-[72px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-heading text-[26px] leading-[1.1] font-bold lg:text-[34px]">{l.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-3 lg:text-[15px]">
          <p className="m-0">{l.intro}</p>
          <details className="relative max-sm:open:basis-full">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 text-[13px] font-bold text-accent-fg [&::-webkit-details-marker]:hidden">
              <HelpCircle className="size-3.5" strokeWidth={2} aria-hidden="true" />
              {l.how}
            </summary>
            <p className="absolute top-full left-0 z-20 m-0 w-[min(520px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-3.5 text-[13px] leading-[1.5] text-fg-2 shadow-lg max-sm:static max-sm:mt-1 max-sm:w-auto">
              {l.howText}
            </p>
          </details>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:gap-3.5">
        {statuses.map((status) => {
          const on = filter === status;
          return (
            <button
              key={status}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={format(l.filterLabel, { status: t.status[status] })}
              onClick={() => setFilter(on ? null : status)}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-[18px] border p-3 text-left transition-colors lg:p-4",
                on ? cn("bg-card", statusColors[status].tile) : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className="flex items-center gap-2 text-xs font-bold text-fg-3 lg:text-[13px]">
                <span aria-hidden="true" className={cn("size-2 rounded-full", statusColors[status].dot)} />
                {t.status[status]}
              </span>
              <b className={cn("font-heading text-[26px] leading-none lg:text-[32px]", statusColors[status].text)}>{count(status)}</b>
              <span className="truncate text-[11px] text-fg-4 lg:text-xs">{l.filterHint[status]}</span>
            </button>
          );
        })}
      </div>

      {filter ? (
        <div className="-my-1 flex items-center gap-2.5 text-sm text-fg-2 [animation:fade-in_.2s_ease-out_both]">
          <span>{l.filterOn[filter]}</span>
          <button type="button" onClick={() => setFilter(null)} className="h-10 rounded-lg px-2.5 text-sm font-bold text-accent-fg">
            {l.showAll}
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {neighborhoods.map((n) => {
          const shown = (row: AdminLabRow) => filter === null || row.status === filter;
          if (filter && !n.labs.some(shown)) return null;
          const blocks = blocksOf(n.labs);
          const trainings = blocks.flatMap((b) => (b.training ? [b.training] : []));
          return (
            <section key={n.id} aria-label={n.name} className="flex flex-col gap-2">
              <HoodHead neighborhood={n} trainings={trainings.length} />
              {n.labs.length === 0 ? (
                <p className="m-0 rounded-2xl border border-dashed border-line px-4 py-3.5 text-[13px] text-fg-3">{l.empty}</p>
              ) : (
                <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
                  <div className={cn("px-[18px] py-2 text-[11px] font-bold tracking-[.8px] text-fg-4 max-lg:hidden", columns)} aria-hidden="true">
                    <span>{l.columns.order}</span>
                    <span>{l.columns.room}</span>
                    <span>{l.columns.status}</span>
                    <span>{l.columns.finished}</span>
                    <span title={l.noticedTitle}>{l.columns.noticed}</span>
                    <span />
                  </div>
                  {blocks.map((block, bi) => {
                    const training = block.training;
                    const open = !training || filter !== null || !closed.includes(training.id);
                    const advanced = trainings.filter((x) => !x.basic);
                    const index = training ? advanced.findIndex((x) => x.id === training.id) : -1;
                    const number = training ? trainings.indexOf(training) + 1 : null;
                    return (
                      <div key={training?.id ?? `none-${bi}`} className="border-line max-lg:[&+&]:border-t lg:border-t">
                        {training && shown(training) ? (
                          <Row
                            row={training}
                            number={`${number}`}
                            canUp={canPublish && !actions.pending && index > 0}
                            canDown={canPublish && !actions.pending && index >= 0 && index < advanced.length - 1}
                            canPublish={canPublish && !actions.pending}
                            onMove={(d) => actions.move(training, d)}
                            onToggle={() => actions.toggle(training, n)}
                            fold={
                              filter === null && block.scenarios.length > 0
                                ? { open, label: format(open ? l.collapse : l.expand, { name: training.name }), onClick: () => toggleBlock(training.id) }
                                : undefined
                            }
                            scenarios={block.scenarios.length}
                          />
                        ) : null}
                        {training && open && filter === null && block.scenarios.length === 0 ? (
                          <p className="m-0 border-t border-card px-[18px] py-2.5 text-[13px] text-fg-4 lg:pl-[134px]">{l.noScenario}</p>
                        ) : null}
                        {open
                          ? block.scenarios.map((row, si) =>
                              shown(row) ? (
                                <div key={row.id} className="border-t border-card">
                                  <Row
                                    row={row}
                                    child
                                    number={number ? `${number}.${si + 1}` : `${si + 1}`}
                                    canUp={canPublish && !actions.pending && si > 0}
                                    canDown={canPublish && !actions.pending && si < block.scenarios.length - 1}
                                    canPublish={canPublish && !actions.pending}
                                    onMove={(d) => actions.move(row, d)}
                                    onToggle={() => actions.toggle(row, n)}
                                  />
                                </div>
                              ) : null,
                            )
                          : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {actions.ui}
    </main>
  );
}

function HoodHead({ neighborhood: n, trainings }: { neighborhood: AdminNeighborhood; trainings: number }) {
  const l = getMessages().admin.list;
  const tone = toneOf(n.color);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <span aria-hidden="true" className={cn("flex size-8 flex-none items-center justify-center rounded-[10px]", tone.soft)}>
        <DistrictGlyph icon={n.icon} className={cn("size-[18px]", tone.text)} />
      </span>
      <h2 className="m-0 font-heading text-[17px] font-bold lg:text-[19px]">{n.name}</h2>
      <span className="flex flex-wrap items-center gap-x-3 text-[13px] text-fg-3">
        <span>{format(l.groupTrainings, { n: trainings })}</span>
        {statuses.map((status) => {
          const count = n.labs.filter((r) => r.status === status).length;
          return count ? (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", statusColors[status].dot)} />
              {format(l.groupCount[status], { n: count })}
            </span>
          ) : null;
        })}
      </span>
    </div>
  );
}

function Row({
  row,
  child = false,
  number,
  canUp,
  canDown,
  canPublish,
  onMove,
  onToggle,
  fold,
  scenarios,
}: {
  row: AdminLabRow;
  child?: boolean;
  number: string;
  canUp: boolean;
  canDown: boolean;
  canPublish: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  fold?: { open: boolean; label: string; onClick: () => void };
  scenarios?: number;
}) {
  const t = getMessages().admin;
  const l = t.list;
  const Icon = sceneIcon[row.template];
  const draft = row.status === "DRAFT";
  const kind = row.type === "SCENARIO" ? l.kind.scenario : row.basic ? l.kind.basic : l.kind.advanced;
  const arrow = "flex size-10 items-center justify-center rounded-[10px] border border-line text-fg-2 transition-colors hover:border-accent hover:text-fg disabled:border-card disabled:text-line-strong lg:size-[34px]";

  return (
    <div className={cn("flex flex-col gap-2.5 px-3.5 py-3 lg:px-[18px] lg:py-2.5", columns, row.status === "HIDDEN" && "[&_.room-name]:text-fg-2")}>
      <div className={cn("flex min-w-0 items-center gap-3 lg:contents", child && "max-lg:pl-4")}>
        {row.basic ? (
          <span className="flex w-10 flex-none items-center justify-center text-fg-4 lg:w-[72px]" title={l.fixedFirst}>
            <Lock className="size-4" strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">{l.fixedFirst}</span>
          </span>
        ) : (
          <span className="flex flex-none gap-1.5 lg:gap-1">
            <button type="button" onClick={() => onMove(-1)} disabled={!canUp} aria-label={format(l.moveUp, { name: row.name })} className={arrow}>
              <ArrowUp className="size-4" strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={!canDown} aria-label={format(l.moveDown, { name: row.name })} className={arrow}>
              <ArrowDown className="size-4" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </span>
        )}

        <span className={cn("flex min-w-0 flex-1 items-center gap-2", child && "lg:pl-10")}>
          {fold ? (
            <button
              type="button"
              onClick={fold.onClick}
              aria-expanded={fold.open}
              aria-label={fold.label}
              className="-mx-1.5 flex size-10 flex-none items-center justify-center rounded-lg text-fg-3 hover:text-fg lg:-ml-1 lg:size-7"
            >
              {fold.open ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
            </button>
          ) : !child ? (
            <span className="w-8 flex-none max-lg:hidden lg:w-6" />
          ) : null}
          <span className={cn("flex-none text-[13px] font-bold tabular-nums", child ? "w-7 text-fg-4" : "w-5 text-fg-2")}>{number}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link href={paths.adminLab(row.id)} aria-label={format(l.open, { name: row.name })} className="room-name min-w-0 text-fg no-underline hover:underline">
                <b className={cn("leading-snug break-words", child ? "text-[14.5px] font-semibold" : "text-[15.5px]")}>{row.name}</b>
              </Link>
              {row.type === "TRAINING" ? <span className="rounded-full bg-card px-2 py-px text-[11px] font-bold text-fg-2">{kind}</span> : null}
            </span>
            <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-fg-3">
              <Icon className="size-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
              <span>{format(l.meta, { kind: row.type === "TRAINING" ? l.kind.training : l.kind.scenario, scene: l.scene[row.template] })}</span>
              {scenarios !== undefined ? <span>· {format(l.scenarios, { n: scenarios })}</span> : null}
              {draft ? null : <span className="lg:hidden">· {format(l.finishedCount, { n: thousands(row.finished) })}</span>}
              {row.status === "PUBLISHED" && row.assignedClasses > 0 ? (
                <span className="font-bold text-accent-fg">· {format(l.assigned, { n: row.assignedClasses })}</span>
              ) : null}
            </span>
            {row.hideNote ? <span className="text-xs leading-[1.45] text-fg-3">{format(l.note, { note: row.hideNote })}</span> : null}
            {row.unreadable ? (
              <span className="text-xs font-bold text-warning-fg">{l.unreadable}</span>
            ) : row.unpublishedChanges ? (
              <span className="text-xs font-bold text-accent-fg">{l.unpublished}</span>
            ) : null}
          </span>
        </span>
      </div>

      <div className={cn("flex items-center gap-x-3 lg:contents", child && "max-lg:pl-4")}>
        <span className={cn("inline-flex h-6 flex-none items-center gap-1.5 justify-self-start rounded-full px-[9px] text-xs font-bold whitespace-nowrap", statusColors[row.status].badge)}>
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", statusColors[row.status].dot)} />
          {t.status[row.status]}
        </span>
        <span className="text-[13px] text-fg-3 max-lg:hidden">
          {draft ? (
            <span className="text-fg-4">{l.none}</span>
          ) : (
            <>
              <b className="text-fg tabular-nums">{thousands(row.finished)}</b> {l.finishedWord}
            </>
          )}
        </span>
        <span className="text-[13px] text-fg-3 max-lg:hidden">
          {row.noticed === null ? (
            <span className="text-fg-4">{l.none}</span>
          ) : (
            <>
              <b className={cn("tabular-nums", row.noticed.first >= noticedGoodFrom ? "text-success-fg" : "text-warning-fg")}>{format(l.percent, { n: row.noticed.first })}</b>{" "}
              {l.noticedWord}
            </>
          )}
        </span>
        <span className="ml-auto grid grid-cols-[auto_auto] gap-1.5 justify-self-end lg:ml-0 lg:grid-cols-[92px_132px]">
          <Link
            href={paths.adminLabPreview(row.id)}
            aria-label={format(l.tryLabel, { name: row.name })}
            className="inline-flex size-10 items-center justify-center gap-1.5 rounded-[10px] border border-line text-[13px] font-bold text-fg-2 no-underline transition-colors hover:border-accent hover:text-fg lg:h-9 lg:w-auto lg:px-3"
          >
            <Play className="size-4" strokeWidth={2} aria-hidden="true" />
            <span className="max-lg:hidden">{l.try}</span>
          </Link>
          <Toggle row={row} disabled={!canPublish} onClick={onToggle} />
        </span>
      </div>
    </div>
  );
}

/** Tek düğme: yayındaysa Gizle, gizliyse Yeniden aç, taslaksa Yayınla. Yayındaki eğitim gizlenmez. */
function Toggle({ row, disabled, onClick }: { row: AdminLabRow; disabled: boolean; onClick: () => void }) {
  const l = getMessages().admin.list;
  if (row.status === "PUBLISHED" && row.type === "TRAINING") return <span className="max-lg:hidden" />;
  const [label, aria, Icon, tone] =
    row.status === "PUBLISHED"
      ? ([l.hide, l.hideLabel, EyeOff, "border-line text-fg-2 hover:border-warning hover:text-warning-fg"] as const)
      : row.status === "HIDDEN"
        ? ([l.show, l.showLabel, Eye, "border-success/45 text-success-fg hover:border-success"] as const)
        : ([l.publish, l.publishLabel, Send, "border-success/45 text-success-fg hover:border-success"] as const);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={format(aria, { name: row.name })}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border bg-transparent px-3 text-[13px] font-bold whitespace-nowrap transition-colors disabled:opacity-50 lg:h-9",
        tone,
      )}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
}
