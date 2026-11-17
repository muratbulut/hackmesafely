"use client";

import Link from "next/link";
import { ClipboardList, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { TeacherAvatar } from "@/components/school/TeacherList";
import { Loading } from "@/components/status/Loading";
import { applicationsHref } from "@/lib/admin/application-rules";
import { openStudentProfile, type UserActionError } from "@/lib/admin/user-actions";
import type { CalendarCell } from "@/lib/admin/users-model";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Drawer } from "./Drawer";
import type { StudentProfile } from "./types";

type Loaded = { id: string; profile: StudentProfile } | { id: string; error: UserActionError };

/**
 * Öğrencinin kısa profili ("Sıkı çekmece", 17 Kasım, Murat): en üstte "bu bakış kayda yazıldı"
 * satırı, "Ad S.", sınıfı, bekleyen öğretmenlik talebi (rozet ve "Talebi aç"), dört sayı (bitirdiği
 * oda, son 4 haftada aktif gün, haftada ortalama, son aktif), son 4 haftanın takvimi, şu an
 * yaptığı, mahalleler ve bitirdiği lablar.
 * E-posta, soyadı, puan ve rapor cevabı yok. Profil sunucu eylemiyle gelir; her açılış kayıt
 * defterine yazılır (eylem yazar, burası yalnızca ister).
 */
export function StudentDrawer({ id, onClose, overlay }: { id: string | null; onClose: () => void; overlay?: ReactNode }) {
  const t = getMessages().adminUsers.profile;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Aynı açılış için bir kez istenir (geliştirmedeki çift çalıştırma iki kayıt yazmasın).
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      requested.current = null;
      return;
    }
    if (requested.current === id) return;
    requested.current = id;
    void load(id);
  }, [id]);

  async function load(studentId: string) {
    try {
      const result = await openStudentProfile(studentId);
      if (requested.current !== studentId) return;
      setLoaded(result.ok ? { id: studentId, profile: result.profile } : { id: studentId, error: result.error });
    } catch {
      if (requested.current === studentId) setLoaded({ id: studentId, error: "failed" });
    }
  }

  const current = loaded && loaded.id === id ? loaded : null;
  const label = current && "profile" in current ? current.profile.name : t.label;

  return (
    <Drawer open={id !== null} label={label} closeLabel={t.close} onClose={onClose} overlay={overlay}>
      {!current ? (
        <Loading cardCount={1} text={t.loading} />
      ) : "profile" in current ? (
        <ProfileBody profile={current.profile} />
      ) : current.error === "notFound" ? (
        <p className="m-0 text-sm leading-normal text-fg-3">{t.notFound}</p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-sm leading-normal text-fg-3">
            {current.error === "failed" ? t.failed : getMessages().adminUsers.errors[current.error]}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoaded(null);
              if (id) void load(id);
            }}
            className="h-10 cursor-pointer rounded-xl border border-line bg-surface px-4 font-[inherit] text-sm font-bold text-fg"
          >
            {t.retry}
          </button>
        </div>
      )}
    </Drawer>
  );
}

function ProfileBody({ profile }: { profile: StudentProfile }) {
  const t = getMessages().adminUsers.profile;
  const months = getMessages().profile.months;
  const cellDate = (cell: CalendarCell) => format(t.cellDate, { day: cell.day, month: months[cell.month] });
  const sub = [profile.classLine ?? t.noClass, profile.moreClasses > 0 ? format(t.moreClasses, { n: profile.moreClasses }) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <span className="-mt-2 flex items-start gap-1.5 text-xs leading-[1.45] text-fg-4" data-testid="profile-viewed">
        <EyeOff className="mt-px size-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
        {t.viewed}
      </span>
      <div className="flex items-center gap-3.5">
        <TeacherAvatar emoji={profile.avatar} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <b className="font-heading text-[22px] break-words">{profile.name}</b>
            {profile.application ? (
              <span className="inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full bg-warning/14 px-2 text-[11px] font-extrabold tracking-[.3px] whitespace-nowrap text-warning-fg">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
                {t.applicant}
              </span>
            ) : null}
          </span>
          <span className="text-[13px] leading-[1.4] text-fg-3">{sub}</span>
          {profile.team ? (
            <span className="mt-0.5 self-start rounded-full bg-purple/14 px-[9px] py-[3px] text-xs font-bold text-purple-fg">
              {profile.team.length > 0 ? format(t.team, { permissions: profile.team.join(", ") }) : t.teamAll}
            </span>
          ) : null}
        </span>
      </div>

      {profile.application ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-warning/35 bg-warning/8 px-3.5 py-3">
          <ClipboardList className="size-[18px] flex-none text-warning-fg" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 flex-[1_1_200px] text-[13px] leading-normal text-fg">
            <b>{t.applicantTitle}</b> {t.applicantText}
          </span>
          <Link
            href={applicationsHref("pending", profile.application)}
            className="inline-flex min-h-10 items-center text-[13px] font-bold whitespace-nowrap text-warning-fg no-underline"
          >
            {t.applicantLink}
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={String(profile.labs)} label={t.labs} />
        <Stat value={format(t.activeDaysValue, { n: profile.activeDays, total: profile.cells.filter((c) => c.state === "member").length })} label={t.activeDays} />
        <Stat value={profile.weekly} label={t.weekly} />
        <Stat value={profile.lastActive ?? getMessages().adminUsers.never} label={t.lastActive} />
      </div>

      <section aria-labelledby="student-weeks" className="flex flex-col gap-2.5 rounded-2xl border border-card bg-surface-deep px-4 py-3.5">
        <span className="flex items-baseline justify-between gap-2">
          <b id="student-weeks" className="text-[15px]">
            {t.weeks}
          </b>
          <span className="text-xs text-fg-4">{format(t.joined, { date: profile.joined })}</span>
        </span>
        <div className="grid grid-cols-7 gap-1.5">
          {t.weekdays.map((day) => (
            <span key={day} aria-hidden="true" className="text-center text-[11px] font-bold text-fg-4">
              {day}
            </span>
          ))}
        </div>
        <div role="img" aria-label={format(t.gridLabel, { n: profile.activeDays })} className="grid grid-cols-7 gap-1.5">
          {profile.cells.map((cell) => (
            <span
              key={cell.key}
              title={cell.state === "before" ? format(t.cellBefore, { date: cellDate(cell) }) : format(t.cell, { date: cellDate(cell), n: cell.count })}
              className={cn(
                "block aspect-square rounded-[5px] border-[1.5px]",
                cell.state === "before"
                  ? "border-dashed border-line bg-transparent"
                  : cell.state === "future"
                    ? "border-transparent bg-transparent"
                    : cell.count >= 2
                      ? "border-transparent bg-accent"
                      : cell.count === 1
                        ? "border-transparent bg-accent/45"
                        : "border-transparent bg-card",
                cell.today && "border-fg",
              )}
            />
          ))}
        </div>
        <span className="flex flex-wrap gap-3 text-xs text-fg-3">
          <Legend className="bg-card" text={t.legend.none} />
          <Legend className="bg-accent/45" text={t.legend.one} />
          <Legend className="bg-accent" text={t.legend.many} />
          <Legend className="border-dashed border-line bg-transparent" text={t.legend.before} />
        </span>
      </section>

      {profile.current ? (
        <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <span aria-hidden="true" className={cn("size-2.5 flex-none rounded-full ring-4 ring-accent/12", toneOf(profile.current.color).fill)} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-bold text-fg-3">{t.current}</span>
            <b className="text-sm break-words">{profile.current.name}</b>
            <span className="text-xs text-fg-4">{profile.current.neighborhood}</span>
          </span>
        </div>
      ) : null}

      <section aria-labelledby="student-neighborhoods" className="flex flex-col gap-2.5">
        <span id="student-neighborhoods" className="text-xs font-bold tracking-[.8px] text-fg-4">
          {t.neighborhoods}
        </span>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {profile.neighborhoods.map((n) => {
            const tone = toneOf(n.color);
            const width = n.done > 0 && n.total > 0 ? Math.max(6, Math.round((n.done / n.total) * 100)) : 0;
            return (
              <li
                key={n.id}
                aria-label={format(t.neighborhoodLabel, { name: n.name, done: n.done, total: n.total })}
                className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_36px] items-center gap-2.5 lg:grid-cols-[150px_minmax(0,1fr)_36px]"
              >
                <span className="flex min-w-0 items-center gap-2 text-[13px] text-fg-2">
                  <span aria-hidden="true" className={cn("size-2 flex-none rounded-full", tone.fill)} />
                  <span className="truncate">{n.name}</span>
                </span>
                <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-card">
                  <span className={cn("block h-full rounded-full", tone.fill)} style={{ width: `${width}%` }} />
                </span>
                <b aria-hidden="true" className="text-right text-[13px]">
                  {format(t.neighborhoodCount, { done: n.done, total: n.total })}
                </b>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="student-finished" className="flex flex-col">
        <span id="student-finished" className="pb-2 text-xs font-bold tracking-[.8px] text-fg-4">
          {t.finished}
        </span>
        {profile.finished.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {profile.finished.map((lab) => (
              <li key={lab.id} className="flex items-center gap-3 border-t border-line py-2.5">
                <span aria-hidden="true" className={cn("w-1 flex-none self-stretch rounded-full", toneOf(lab.color).fill)} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-sm break-words">{lab.name}</b>
                    {lab.training ? (
                      <span className="rounded-[5px] bg-card px-1.5 py-0.5 text-[10px] font-extrabold tracking-[.6px] text-fg-3">{t.training}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-fg-4">{lab.neighborhood}</span>
                </span>
                <span className="flex-none text-[13px] text-fg-3">{lab.when}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="rounded-[14px] border border-dashed border-line p-3.5 text-[13px] text-fg-3">{t.noFinished}</span>
        )}
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
      <b className="font-heading text-[22px] leading-[1.15] break-words">{value}</b>
      <span className="text-xs leading-[1.35] text-fg-3">{label}</span>
    </div>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("size-3 rounded-[3px] border-[1.5px] border-transparent", className)} />
      {text}
    </span>
  );
}
