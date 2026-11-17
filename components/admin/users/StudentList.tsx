"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { studentFilters, usersHref } from "@/lib/admin/users-model";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUsers } from "./context";
import { Pager, UrlSearch } from "./ListControls";
import type { StudentPage, StudentRow } from "./types";

type Group = { key: string; title: string; sub: string | null; rows: StudentRow[] };

/** Sayfadaki öğrenciler sınıflarına göre (sunucu sınıf sırasıyla verir); sınıfı olmayanlar en sonda tek grup. */
function groupRows(rows: StudentRow[]): Group[] {
  const g = getMessages().adminUsers.students.group;
  const groups: Group[] = [];
  for (const row of rows) {
    const key = row.group?.id ?? "";
    const last = groups.at(-1);
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, title: row.group?.name ?? g.noClass, sub: row.group ? row.group.teacher : null, rows: [row] });
  }
  return groups;
}

const nf = (n: number) => n.toLocaleString("tr-TR");

/**
 * Öğrenciler sekmesi, "Sınıfa göre gruplu" (17 Kasım, Murat): arama (ad, sınıf, öğretmen),
 * süzgeç çipleri (Hepsi, Sınıfı olan, Sınıfı yok, Bu hafta aktif, Öğretmenlik talebi var), her
 * sınıf bir grup (başlıkta öğretmen, öğrenci sayısı, bu hafta aktif, ortalama oda), sınıfı
 * olmayanlar en altta tek tek. Ad "Ad S." olarak gelir; e-posta, puan ve rapor yok. Satıra
 * dokununca kısa profil açılır; grup başlığı grubu kapatır.
 */
export function StudentList({ data }: { data: StudentPage }) {
  const t = getMessages().adminUsers;
  const s = t.students;
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
      <UrlSearch base={{ filter: data.filter }} value={data.search} placeholder={t.search.students} />

      <nav aria-label={s.filters.label} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {studentFilters.map((filter) => {
          const on = filter === data.filter;
          const warn = filter === "talep";
          return (
            <Link
              key={filter}
              href={usersHref({ filter, search: data.search })}
              aria-current={on ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex h-10 flex-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold whitespace-nowrap no-underline",
                on ? "border-accent bg-accent/12 text-fg" : warn ? "border-warning/40 bg-surface text-warning-fg" : "border-line bg-surface text-fg-3 hover:text-fg",
              )}
            >
              {s.filters[filter]}
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]",
                  on ? "bg-accent text-on-accent" : warn ? "bg-warning/15 text-warning-fg" : "bg-card text-fg-2",
                )}
              >
                {nf(data.filterCounts[filter])}
              </span>
            </Link>
          );
        })}
      </nav>

      {data.rows.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line p-7 text-center text-[13px] leading-normal text-fg-3">
          {data.search ? s.noMatch : data.filter !== "hepsi" ? s.emptyFilter : s.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="student-groups">
          {groups.map((group) => {
            const open = !closed.has(group.key);
            const active = group.rows.filter((row) => row.activeWeek).length;
            const average = Math.round((group.rows.reduce((sum, row) => sum + row.labs, 0) / group.rows.length) * 10) / 10;
            const listId = `students-${group.key || "none"}`;
            return (
              <section key={group.key} aria-label={group.sub ? format(s.classLabel, { name: group.title, teacher: group.sub }) : group.title} className="overflow-hidden rounded-[20px] border border-line bg-surface">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={() => toggle(group.key)}
                  className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left font-[inherit] text-fg lg:px-[18px]"
                >
                  <ChevronDown className={cn("size-[18px] flex-none text-fg-3 transition-transform", !open && "-rotate-90")} strokeWidth={2} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <b className="font-heading text-[17px] [overflow-wrap:anywhere]">{group.title}</b>
                    <span className={cn("text-sm", group.sub ? "text-fg-3" : "text-fg-4")}>{group.sub ?? s.group.noClassSub}</span>
                  </span>
                  <span className="flex flex-none items-center gap-4 text-[13px] text-fg-3">
                    <span>{format(s.group.students, { n: nf(group.rows.length) })}</span>
                    <span className="max-lg:hidden">{format(s.group.active, { n: nf(active) })}</span>
                    <span className="max-lg:hidden">{format(s.group.average, { n: average.toLocaleString("tr-TR") })}</span>
                  </span>
                </button>
                {open ? (
                  <ul id={listId} className="m-0 grid list-none grid-cols-1 border-t border-line p-0 lg:grid-cols-2">
                    {group.rows.map((row, i) => (
                      <li key={row.id} className={cn("border-line", i > 0 && "border-t", i % 2 === 1 && "lg:border-l", i === 1 && "lg:border-t-0")}>
                        <StudentButton row={row} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <Pager base={{ filter: data.filter }} info={data} />

      <span className="text-[13px] text-fg-3 max-lg:hidden">{s.note}</span>
      <span className="text-[13px] text-fg-3 lg:hidden">{s.noteMobile}</span>
    </div>
  );
}

/** Öğrenci satırı: avatar, "Ad S.", talep rozeti, bitirdiği oda, son giriş (yeşil nokta: son 7 gün). */
function StudentButton({ row }: { row: StudentRow }) {
  const t = getMessages().adminUsers;
  const s = t.students;
  const { openStudent } = useUsers();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => openStudent(row.id)}
      className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left font-[inherit] text-fg hover:bg-card/50 lg:px-[18px]"
    >
      <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full border border-line bg-card text-base">
        {row.avatar}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <b className="truncate text-sm">{row.name}</b>
        {row.applicant ? (
          <span className="inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full bg-warning/14 px-2 text-[11px] font-extrabold tracking-[.3px] whitespace-nowrap text-warning-fg">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
            {s.applicantShort}
          </span>
        ) : null}
      </span>
      <b className="flex-none text-right text-[13px] whitespace-nowrap">{format(s.labs, { n: row.labs })}</b>
      <span className="flex w-[92px] flex-none items-center gap-2 text-[13px] whitespace-nowrap text-fg-3 max-sm:w-auto">
        <span
          aria-hidden="true"
          className={cn("inline-block size-2 flex-none rounded-full", !row.lastSeen ? "border border-line" : row.activeWeek ? "bg-success" : "bg-line-strong")}
        />
        <span className="sr-only">{format(s.lastSeenLabel, { when: row.lastSeen ?? t.never })}</span>
        <span aria-hidden="true">{row.lastSeen ?? t.never}</span>
      </span>
      <ChevronRight className="size-4 flex-none text-accent-fg" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
