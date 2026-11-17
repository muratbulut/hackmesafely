"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, School } from "lucide-react";
import { SetupBar, SignalChip, TeacherAvatar } from "@/components/school/TeacherList";
import { funnelOf, hintText } from "@/lib/admin/users-model";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUsers } from "./context";
import { Pager, UrlSearch } from "./ListControls";
import { classSummary, TeacherTags } from "./TeacherBits";
import type { AdminTeacher, TeacherPage } from "./types";

type Group = { key: string; name: string; place: string | null; rows: AdminTeacher[] };

/** Sayfadaki öğretmenler okullarına göre (sunucu okul sırasıyla verir); okulu olmayanlar sonda tek grup. */
function groupRows(rows: AdminTeacher[]): Group[] {
  const t = getMessages().adminUsers.teachers.group;
  const groups: Group[] = [];
  for (const row of rows) {
    const key = row.school?.id ?? "";
    const last = groups.at(-1);
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, name: row.school?.name ?? t.noSchool, place: row.school?.place ?? null, rows: [row] });
  }
  return groups;
}

/**
 * Öğretmenler sekmesi, "Okula göre gruplu" (17 Kasım, Murat): aramanın yanında bekleyen talepler
 * bağlantısı, her okul bir grup (başlıkta il · ilçe, öğretmen sayısı ve bu sayfadaki öğretmenlerin
 * kurulum hunisi), okulu olmayanlar sonda; okulun içinde ad sırası, sayfa sayfa. Kurulum çubuğu ve
 * işaret Okulum'la aynı kuraldan gelir. Satıra dokununca öğretmen çekmecesi açılır.
 */
export function TeacherTable({ pending, data }: { pending: number; data: TeacherPage }) {
  const t = getMessages().adminUsers;
  const groups = groupRows(data.rows);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setClosed((keys) => {
      const next = new Set(keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-3.5 [animation:fade-in_.2s_ease-out_both]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:flex-1">
          <UrlSearch base={{ tab: "ogretmenler" }} value={data.search} placeholder={t.search.teachers} />
        </div>
        <Link
          href={paths.adminApplications}
          className="flex min-h-[46px] items-center gap-3 rounded-[14px] border border-warning/30 bg-warning/8 px-4 py-2 text-fg no-underline hover:border-warning/60 lg:flex-none"
        >
          <ClipboardList className="size-[18px] flex-none text-warning-fg" strokeWidth={2} aria-hidden="true" />
          <span className="flex-1 text-sm font-bold">{pending > 0 ? format(t.teachers.pending, { n: pending }) : t.teachers.pendingNone}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-warning-fg">
            {t.teachers.pendingLink}
            <ChevronRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </span>
        </Link>
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line p-7 text-center text-[13px] leading-normal text-fg-3">
          {data.search ? t.teachers.noMatch : t.teachers.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="teacher-groups">
          {groups.map((group) => {
            const open = !closed.has(group.key);
            const listId = `teachers-${group.key || "none"}`;
            const n = group.rows.length;
            return (
              <section key={group.key} aria-label={group.name} className="overflow-hidden rounded-[20px] border border-line bg-surface">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-[18px]">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={listId}
                    onClick={() => toggle(group.key)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-[inherit] text-fg"
                  >
                    <ChevronDown className={cn("size-[18px] flex-none text-fg-3 transition-transform", !open && "-rotate-90")} strokeWidth={2} aria-hidden="true" />
                    <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-card text-fg-2">
                      <School className="size-[18px]" strokeWidth={2} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="font-heading text-[17px] [overflow-wrap:anywhere]">{group.name}</b>
                      <span className="text-xs text-fg-3">
                        {group.place ? format(t.teachers.group.placeCount, { place: group.place, n }) : format(t.teachers.group.count, { n })}
                      </span>
                    </span>
                  </button>
                  {group.key ? <MiniFunnel rows={group.rows} /> : null}
                </div>
                {open ? (
                  <ul id={listId} className="m-0 list-none p-0">
                    {group.rows.map((teacher) => (
                      <li key={teacher.id} className="border-t border-line">
                        <TeacherRow teacher={teacher} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <Pager base={{ tab: "ogretmenler" }} info={data} />

      <span className="text-[13px] leading-normal text-fg-3">{t.teachers.note}</span>
    </div>
  );
}

/** Öğretmen satırı: ad ve etiketler, branş; kurulum çubuğu, işaret ve durum cümlesi; sınıflar; son giriş. */
function TeacherRow({ teacher }: { teacher: AdminTeacher }) {
  const t = getMessages().adminUsers;
  const { openTeacher } = useUsers();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={format(t.teachers.openLabel, { name: teacher.name })}
      onClick={() => openTeacher(teacher.id)}
      className="flex w-full cursor-pointer flex-col gap-2 border-0 bg-transparent px-4 py-3 text-left font-[inherit] text-fg hover:bg-card/50 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,.9fr)_120px_24px] lg:items-center lg:gap-4 lg:px-[18px]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <TeacherAvatar emoji={teacher.avatar} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-sm">{teacher.name}</b>
          <TeacherTags teacher={teacher} />
          <span className="truncate text-xs text-fg-3">{teacher.subject || t.teachers.noSubject}</span>
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2.5">
          <SetupBar step={teacher.step} signal={teacher.signal} />
          <SignalChip signal={teacher.signal} />
        </span>
        <span className="text-xs text-fg-3">{hintText(teacher.hint)}</span>
      </span>
      <span className="text-[13px] text-fg-2">{classSummary(teacher)}</span>
      <span className="flex items-center gap-2 text-[13px] text-fg-3">
        <span aria-hidden="true" className={cn("inline-block size-2 flex-none rounded-full", teacher.lastSeen ? "bg-line-strong" : "border border-line")} />
        <span className="sr-only">{format(t.teachers.lastSeenLabel, { when: teacher.lastSeen ?? t.never })}</span>
        <span aria-hidden="true">{teacher.lastSeen ?? t.never}</span>
      </span>
      <ChevronRight className="size-4 flex-none text-accent-fg max-lg:hidden lg:justify-self-end" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

/** Grubun kurulum hunisi (bu sayfadaki öğretmenler): beş adım, her adıma ulaşan öğretmen sayısı. */
function MiniFunnel({ rows }: { rows: AdminTeacher[] }) {
  const s = getMessages().adminUsers.schools;
  const steps = getMessages().school.drawer.steps;
  const funnel = funnelOf(rows.map((row) => row.step));
  const total = funnel[0];
  const list = steps.map((step, i) => format(s.funnelItem, { step: step.title, n: funnel[i] })).join(", ");
  return (
    <span role="img" aria-label={format(s.funnelLabel, { list })} className="flex flex-none items-end gap-1 max-lg:hidden">
      {steps.map((step, i) => (
        <span key={step.title} className="flex flex-col items-center gap-0.5">
          <span className={cn("block h-1.5 w-6 rounded-full", funnel[i] === 0 ? "bg-card" : funnel[i] === total ? "bg-success" : "bg-accent")} />
          <span className="text-[10px] font-bold text-fg-4">{funnel[i]}</span>
        </span>
      ))}
    </span>
  );
}
