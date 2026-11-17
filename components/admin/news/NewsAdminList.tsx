"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CalendarX2, PenLine, Plus, Trash2 } from "lucide-react";
import { CoverImage } from "@/components/news/CoverImage";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { format, getMessages } from "@/lib/i18n";
import { deleteDraft, restoreDraft, undoUnschedule, unscheduleArticle, type NewsActionError, type NewsResult } from "@/lib/news/actions";
import type { ArticleState } from "@/lib/news/content";
import type { AdminArticleRow, CalendarWeek } from "@/lib/news/data";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { nextToast, UndoToast, type ToastData } from "../UndoToast";
import { missingText, stateBadge, tabParams, type NewsTab } from "./shared";

const tabs: NewsTab[] = ["live", "scheduled", "draft"];

/**
 * Gündem listesi (Gundem-Son, E1): Yayında / Planlı / Taslak sekmeleri; yayındaki haberde okuma
 * sayısı, diğerlerinde "Yayına hazır" ya da eksikler. Satıra dokununca düzenleyici açılır.
 * Planlı haberin planı kaldırılır, taslak silinir; ikisinin de 5 saniyelik "Geri al"ı var.
 * Hoca öncesi kontrol (41): üstte önümüzdeki 6 Cuma (dolu olanda haber, boş olanda "Haber yaz"),
 * satırlarda küçük kapak (görsel yoksa konunun çizimi).
 */
export function NewsAdminList({ rows, weeks, initialTab }: { rows: AdminArticleRow[]; weeks: CalendarWeek[]; initialTab: NewsTab }) {
  const t = getMessages();
  const n = t.news.admin;
  const router = useRouter();
  const [tab, setTab] = useState<NewsTab>(initialTab);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pending, startTransition] = useTransition();

  const countOf = (state: ArticleState) => rows.filter((r) => r.state === state).length;
  const shown = rows
    .filter((r) => r.state === tab)
    .sort((a, b) => (tab === "scheduled" ? (a.week ?? "").localeCompare(b.week ?? "") : tab === "draft" ? b.updatedAt - a.updatedAt : (b.week ?? "").localeCompare(a.week ?? "")));

  const say = (message: string, undo?: () => void) => setToast(nextToast({ message, undo }));
  const fail = (error: NewsActionError) => setToast(nextToast({ message: n.errors[error], tone: "error" }));

  function run(task: () => Promise<void>) {
    startTransition(async () => {
      try {
        await task();
      } catch {
        fail("failed");
      }
      router.refresh();
    });
  }

  function undo(action: () => Promise<NewsResult<object>>) {
    run(async () => {
      const result = await action();
      if (!result.ok) return fail(result.error);
      say(n.toasts.undone);
    });
  }

  function chooseTab(next: NewsTab) {
    setTab(next);
    window.history.replaceState(null, "", `${paths.adminNews}?sekme=${tabParams[next]}`);
  }

  function remove(row: AdminArticleRow) {
    run(async () => {
      const result = await deleteDraft(row.id);
      if (!result.ok) return fail(result.error);
      say(format(n.toasts.deleted, { title: row.title || n.untitled }), () => undo(() => restoreDraft(row.id)));
    });
  }

  function unschedule(row: AdminArticleRow) {
    run(async () => {
      const result = await unscheduleArticle(row.id);
      if (!result.ok) return fail(result.error);
      say(format(n.toasts.unscheduled, { title: row.title }), () => undo(() => undoUnschedule(row.id)));
    });
  }

  return (
    <main className="flex flex-col gap-[22px] px-4 pt-6 pb-16 lg:px-9 lg:pt-8 lg:pb-[72px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-heading text-[28px] leading-[1.1] font-bold lg:text-[34px]">{t.admin.menu.news}</h1>
          <p className="m-0 max-w-[640px] text-[15px] leading-[1.55] text-fg-3">{n.intro}</p>
        </div>
        <Link
          href={paths.adminNewArticle}
          className="inline-flex h-[46px] items-center gap-2 self-start rounded-xl bg-accent px-[18px] text-[15px] font-bold text-on-accent no-underline lg:self-auto"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          {n.newArticle}
        </Link>
      </div>

      <Calendar weeks={weeks} rows={rows} />

      <div className="flex max-w-[980px] flex-col gap-3.5">
        <div role="tablist" aria-label={n.tabsLabel} className="flex gap-3 border-b border-card">
          {tabs.map((key) => {
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`news-tab-${key}`}
                aria-selected={on}
                aria-controls="news-tab-panel"
                onClick={() => chooseTab(key)}
                className={cn(
                  "-mb-px inline-flex h-11 flex-none cursor-pointer items-center gap-2 border-0 border-b-2 bg-transparent px-1.5 text-[15px] font-bold lg:px-3.5",
                  on ? "border-accent text-fg" : "border-transparent text-fg-3 hover:text-fg",
                )}
              >
                {n.tabs[key]}
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-card px-1.5 text-xs text-fg-2">{countOf(key)}</span>
              </button>
            );
          })}
        </div>

        <div id="news-tab-panel" role="tabpanel" aria-labelledby={`news-tab-${tab}`} aria-busy={pending}>
          {shown.length === 0 ? (
            <p className="m-0 p-7 text-center text-fg-3">{n.emptyTab}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {shown.map((row) => (
                <Row key={row.id} row={row} onDelete={() => remove(row)} onUnschedule={() => unschedule(row)} disabled={pending} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <UndoToast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

function Row({ row, onDelete, onUnschedule, disabled }: { row: AdminArticleRow; onDelete: () => void; onUnschedule: () => void; disabled: boolean }) {
  const t = getMessages().news.admin;
  const tone = row.topic ? toneOf(row.topic.color) : null;
  const badge = stateBadge[row.state];
  const title = row.title || t.untitled;
  const status =
    row.state === "live"
      ? { text: format(t.reads, { n: row.readCount.toLocaleString("tr-TR") }), cls: "text-fg-3" }
      : row.readiness.contentReady
        ? { text: t.ready, cls: "text-success-fg" }
        : { text: missingText(row.readiness.missing), cls: "text-warning-fg" };

  return (
    <li className="flex items-stretch gap-2">
      <Link
        href={paths.adminArticle(row.id)}
        aria-label={format(t.edit, { title })}
        className="flex min-w-0 flex-1 items-stretch gap-3.5 rounded-[14px] border border-line bg-surface px-4 py-3.5 text-fg no-underline transition-colors hover:border-accent"
      >
        <span aria-hidden="true" className="flex-none self-center">
          <CoverImage
            cover={row.cover}
            topic={row.topic}
            className="aspect-[4/3] w-16 rounded-[10px] lg:w-[84px]"
            glyphClassName="right-auto left-1/2 h-[58%] -translate-x-1/2 rotate-0"
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className={tone ? tone.text : "text-fg-3"}>{row.topic?.topic ?? t.noTopic}</span>
            <span className="text-fg-4">
              {"· "}
              {row.day || t.noDate}
            </span>
          </span>
          <b className="text-[15px] leading-snug break-words">{title}</b>
          <span className={cn("text-xs font-bold", status.cls)}>{status.text}</span>
        </span>
        <span className={cn("inline-flex h-[22px] flex-none items-center self-center rounded-full px-2 text-xs font-bold", badge)}>{t.states[row.state]}</span>
      </Link>
      {row.state === "draft" ? (
        <ActionButton label={format(t.deleteDraftLabel, { title })} onClick={onDelete} disabled={disabled} danger>
          <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </ActionButton>
      ) : row.state === "scheduled" ? (
        <ActionButton label={format(t.unscheduleLabel, { title })} onClick={onUnschedule} disabled={disabled}>
          <CalendarX2 className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </ActionButton>
      ) : null}
    </li>
  );
}

/** Önümüzdeki 6 Cuma: dolu olanda planlanan haber, boş olanda "Haber yaz" (o hafta seçili açılır). */
function Calendar({ weeks, rows }: { weeks: CalendarWeek[]; rows: AdminArticleRow[] }) {
  const c = getMessages().news.admin.calendar;
  const t = getMessages().news.admin;
  const planned = new Map(rows.filter((r) => r.state !== "draft" && r.week).map((r) => [r.week as string, r]));
  const filled = weeks.filter((w) => planned.has(w.key)).length;
  return (
    <section aria-labelledby="news-calendar" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="news-calendar" className="m-0 text-base font-bold">
          {c.title}
        </h2>
        <span className={cn("text-[13px] font-bold", filled < weeks.length ? "text-warning-fg" : "text-success-fg")}>
          {format(c.filled, { n: filled, total: weeks.length })}
        </span>
      </div>
      <ul className="-mx-4 m-0 flex list-none gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:p-0">
        {weeks.map((week) => {
          const row = planned.get(week.key);
          const friday = format(c.friday, { date: week.day });
          if (!row) {
            return (
              <li key={week.key} className="flex w-[180px] flex-none lg:w-auto lg:min-w-0">
                <Link
                  href={paths.adminNewArticleFor(week.key)}
                  aria-label={format(c.writeLabel, { date: week.day })}
                  className="relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-dashed border-warning/50 bg-warning/6 p-3.5 text-fg no-underline transition-colors hover:border-warning"
                >
                  <b className="text-sm">{friday}</b>
                  <span className="text-xs font-bold text-warning-fg">{c.empty}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-bold text-accent-fg">
                    <PenLine className="size-4" strokeWidth={2.2} aria-hidden="true" />
                    {c.write}
                  </span>
                </Link>
              </li>
            );
          }
          const tone = row.topic ? toneOf(row.topic.color) : null;
          const title = row.title || t.untitled;
          return (
            <li key={week.key} className="flex w-[180px] flex-none lg:w-auto lg:min-w-0">
              <Link
                href={paths.adminArticle(row.id)}
                aria-label={format(c.openLabel, { date: week.day, title })}
                className="relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3.5 text-fg no-underline transition-colors hover:border-accent"
              >
                <b className="text-sm">{friday}</b>
                <span aria-hidden="true" className={cn("h-[3px] w-7 rounded-full", tone ? tone.fill : "bg-line-strong")} />
                <span className="line-clamp-3 text-[13px] leading-[1.45] text-fg-2">{title}</span>
                <span className={cn("mt-auto pt-1 text-xs font-bold", row.readiness.contentReady ? "text-success-fg" : "text-warning-fg")}>
                  {row.readiness.contentReady ? t.ready : missingText(row.readiness.missing)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ActionButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex w-12 flex-none cursor-pointer items-center justify-center rounded-[14px] border border-line bg-surface text-fg-3 hover:text-fg disabled:opacity-50",
        danger ? "hover:border-danger hover:text-danger-fg" : "hover:border-accent",
      )}
    >
      {children}
    </button>
  );
}
