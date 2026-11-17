"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, ChevronLeft, ExternalLink, Eye, EyeOff, FileCode2, Lock, Mail, MessageSquare, Play, Send } from "lucide-react";
import { DistrictGlyph, toneOf } from "@/components/roadmap/NeighborhoodIcon";
import type { SceneTemplate } from "@/lib/generated/prisma/enums";
import type { AdminLabRow, AdminNeighborhood } from "@/lib/admin/lab-data";
import { brand } from "@/lib/brand";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { statusColors } from "../colors";
import { useLabActions } from "./useLabActions";

const thousands = (n: number) => n.toLocaleString("tr-TR");
const noticedGoodFrom = 60;
const sceneIcon: Record<SceneTemplate, typeof Mail> = { TRAINING: BookOpen, INBOX: Mail, MESSAGING: MessageSquare };

/**
 * Odanın salt okunur sayfası (39, 17 Kasım, Murat; tuvaldeki R5 paneli): mahalle, durum, sayılar,
 * "Öğrenci gibi dene", yayınla / gizle / yeniden aç ve depodan gelen yeni sürümü yayınla. İçerik
 * burada yazılmaz; odanın dosyası ve GitHub bağlantısı gösterilir. Öğrenci adı yok.
 */
export function RoomPage({
  row,
  neighborhood,
  sourceFile,
  draftIssues,
  missing,
  canPublish,
}: {
  row: AdminLabRow;
  neighborhood: AdminNeighborhood;
  sourceFile: string | null;
  draftIssues: string[] | null;
  missing: string[];
  canPublish: boolean;
}) {
  const t = getMessages().admin;
  const l = t.list;
  const r = t.room;
  const actions = useLabActions();
  const tone = toneOf(neighborhood.color);
  const Icon = sceneIcon[row.template];
  const draft = row.status === "DRAFT";
  const kind = row.type === "SCENARIO" ? l.kind.scenario : row.basic ? l.kind.basic : l.kind.advanced;
  const checklist = r.checklist[row.template] as Record<string, string>;
  const busy = !canPublish || actions.pending;
  const big = "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold whitespace-nowrap no-underline transition-colors disabled:opacity-50";

  const numbers = [
    { value: draft ? r.none : thousands(row.finished), label: r.finished },
    ...(row.type === "SCENARIO"
      ? [
          { value: row.noticed ? format(r.percent, { n: row.noticed.first }) : r.none, label: r.noticedFirst, good: row.noticed ? row.noticed.first >= noticedGoodFrom : null },
          { value: row.noticed ? format(r.percent, { n: row.noticed.last }) : r.none, label: r.noticedLast, good: row.noticed ? row.noticed.last >= noticedGoodFrom : null },
        ]
      : []),
    { value: thousands(row.inProgress), label: r.inProgress },
    { value: thousands(row.assignedClasses), label: r.assigned },
  ];

  return (
    <main className="flex flex-col gap-[18px] px-4 pt-5 pb-16 lg:max-w-[980px] lg:gap-[22px] lg:px-9 lg:pt-8 lg:pb-[72px]">
      <Link href={paths.adminLabs} className="-my-2 inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-accent-fg no-underline">
        <ChevronLeft className="size-4" strokeWidth={2.2} aria-hidden="true" />
        {r.back}
      </Link>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold", tone.soft, tone.text)}>
            <DistrictGlyph icon={neighborhood.icon} className="size-3.5" aria-hidden="true" />
            {neighborhood.name}
          </span>
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold", statusColors[row.status].badge)}>
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", statusColors[row.status].dot)} />
            {t.status[row.status]}
            {row.publishedVersion && !draft ? ` · ${format(r.version, { n: row.publishedVersion })}` : null}
          </span>
        </div>
        <h1 className="m-0 font-heading text-[26px] leading-[1.15] font-bold break-words lg:text-[32px]">{row.name}</h1>
        <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-sm text-fg-3">
          <Icon className="size-4 flex-none" strokeWidth={2} aria-hidden="true" />
          {format(r.meta, { kind, scene: l.scene[row.template], duration: row.durationMin })}
        </p>
        {row.gateName ? <p className="-mt-1.5 m-0 text-sm text-fg-3">{format(r.gate, { name: row.gateName })}</p> : null}
        {row.hideNote ? <p className="m-0 text-sm text-fg-3">{format(l.note, { note: row.hideNote })}</p> : null}
      </div>

      <section aria-label={r.numbers} className={cn("grid grid-cols-2 gap-2 sm:gap-3", numbers.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
        {numbers.map((n) => (
          <span key={n.label} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-surface px-3.5 py-3">
            <b className={cn("font-heading text-[24px] leading-none tabular-nums", "good" in n && n.good !== null ? (n.good ? "text-success-fg" : "text-warning-fg") : "")}>
              {n.value}
            </b>
            <span className="text-xs leading-snug text-fg-3">{n.label}</span>
          </span>
        ))}
      </section>

      <div className="flex flex-wrap gap-2.5">
        <Link href={paths.adminLabPreview(row.id)} className={cn(big, "bg-accent text-on-accent hover:brightness-110")}>
          <Play className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
          {r.tryIt}
        </Link>
        {row.status === "PUBLISHED" && row.type === "TRAINING" ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => actions.toggle(row, neighborhood)}
            aria-label={format(row.status === "PUBLISHED" ? l.hideLabel : row.status === "HIDDEN" ? l.showLabel : l.publishLabel, { name: row.name })}
            className={cn(
              big,
              "border bg-transparent",
              row.status === "PUBLISHED" ? "border-line text-fg-2 hover:border-warning hover:text-warning-fg" : "border-success/45 text-success-fg hover:border-success",
            )}
          >
            {row.status === "PUBLISHED" ? (
              <EyeOff className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            ) : row.status === "HIDDEN" ? (
              <Eye className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Send className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            )}
            {row.status === "PUBLISHED" ? l.hide : row.status === "HIDDEN" ? l.show : l.publish}
          </button>
        )}
        {!draft && row.unpublishedChanges && !row.unreadable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => actions.publishNew(row, neighborhood)}
            aria-label={format(r.publishNewLabel, { name: row.name })}
            className={cn(big, "border border-success/45 bg-transparent text-success-fg hover:border-success")}
          >
            <Send className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            {r.publishNew}
          </button>
        ) : null}
      </div>

      {row.status === "PUBLISHED" && row.type === "TRAINING" ? (
        <p className="-mt-2 m-0 flex items-center gap-2 text-[13px] text-fg-3">
          <Lock className="size-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
          {r.trainingFixed}
        </p>
      ) : null}
      {!draft && row.unpublishedChanges && !row.unreadable ? <p className="-mt-2 m-0 text-[13px] text-accent-fg">{r.changed}</p> : null}

      {draftIssues ? (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-warning/50 bg-warning/8 p-4 text-sm leading-normal text-fg-2">
          <b className="flex items-center gap-2 text-warning-fg">
            <AlertTriangle className="size-4" strokeWidth={2.2} aria-hidden="true" />
            {r.unreadable.title}
          </b>
          <span>{r.unreadable.text}</span>
          <span className="font-bold">{r.unreadable.fields}</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {draftIssues.map((issue) => (
              <li key={issue}>
                <code className="rounded-md bg-card px-1.5 py-0.5 text-xs [overflow-wrap:anywhere]">{issue}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {missing.length ? (
        <section aria-label={r.ready.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-sm leading-normal">
          <b>{r.ready.title}</b>
          <span className="text-fg-3">{r.ready.text}</span>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-fg-2">
            {missing.map((key) => (
              <li key={key}>{checklist[key] ?? key}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 text-[13px] leading-normal text-fg-2">
        <b className="flex items-center gap-2 text-[15px] text-fg">
          <FileCode2 className="size-[18px] text-accent-fg" strokeWidth={2} aria-hidden="true" />
          {sourceFile ? r.file.title : r.file.noneTitle}
        </b>
        {sourceFile ? (
          <>
            <code className="self-start rounded-lg bg-card px-2 py-1 text-xs [overflow-wrap:anywhere]">{sourceFile}</code>
            <span className="text-fg-3">{r.file.text}</span>
            <a
              href={`${brand.sourceUrl}/blob/main/${sourceFile}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 self-start font-bold text-accent-fg no-underline"
            >
              <ExternalLink className="size-4" strokeWidth={2} aria-hidden="true" />
              {r.file.open}
            </a>
          </>
        ) : (
          <span className="text-fg-3">{r.file.none}</span>
        )}
      </section>

      {actions.ui}
    </main>
  );
}
