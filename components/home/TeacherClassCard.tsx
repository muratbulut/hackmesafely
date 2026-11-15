import Link from "next/link";
import { ChevronRight, Plus, TriangleAlert, Users } from "lucide-react";
import { ClassSteps } from "@/components/classroom/ClassSteps";
import type { ClassesData } from "@/components/classroom/types";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { ProgressBar } from "@/components/roadmap/ProgressRing";
import { format, getMessages } from "@/lib/i18n";
import { paths, routes } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Kutuda gösterilen en fazla açık ödev; fazlası Sınıflarım'da. */
const homeworkLimit = 3;

/**
 * Öğretmenin ana sayfasındaki "Sınıfların" kutusu (hoca öncesi kontrol 32): öğrencinin "Sınıfına
 * katıl" kutusu yerine. Sınıfı varsa sınıf ve öğrenci sayısı, açık ödevlerin kaç öğrenci
 * tarafından bitirildiği, dikkat isteyen ilk sınıf ve Sınıflarım bağlantısı; yoksa üç kısa adım ve
 * "İlk sınıfını oluştur". Öğrenci adı ya da puanı yok (Sınıflarım'daki toplamlarla aynı).
 */
export function TeacherClassCard({ data, className }: { data: ClassesData; className?: string }) {
  const m = getMessages().classroom;
  const t = m.home;
  const hasClasses = data.classes.length > 0;
  const homework = data.classes.filter((c) => c.homework).slice(0, homeworkLimit);
  const [attention, ...moreAttention] = data.attention;

  return (
    <section aria-label={t.title} className={cn("flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-4 lg:p-5", className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-accent/12">
          <Users className="size-5 text-accent-fg" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-base font-bold">{t.title}</h3>
          <span className="truncate text-[13px] text-fg-3">
            {hasClasses
              ? format(t.lead, {
                  classes: data.summary.classes,
                  students: data.summary.students,
                })
              : t.emptyLead}
          </span>
        </span>
      </div>

      {hasClasses ? (
        <>
          {homework.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold tracking-[1px] text-fg-4 uppercase">{t.homework}</span>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {homework.map((c) => {
                  const hw = c.homework!;
                  const tone = toneOf(hw.color);
                  return (
                    <li key={c.id}>
                      <Link
                        href={paths.classroom(c.id)}
                        aria-label={format(t.homeworkOf, {
                          class: c.name,
                          name: hw.name,
                          done: hw.finished,
                          total: c.students,
                        })}
                        className="flex flex-col gap-2 rounded-[14px] border border-card bg-surface-raised px-3.5 py-3 text-fg no-underline hover:border-line-strong"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <b className="truncate text-sm">{c.name}</b>
                            <span aria-hidden="true" className={cn("size-[7px] flex-none rounded-full", tone.fill)} />
                            <span className="truncate text-[13px] text-fg-3">{hw.name}</span>
                          </span>
                          <span className="flex-none text-[13px] text-fg-3">
                            {format(m.finishedOf, {
                              done: hw.finished,
                              total: c.students,
                            })}
                          </span>
                        </span>
                        <ProgressBar value={c.students > 0 ? hw.finished / c.students : 0} fillClass={tone.fill} className="h-1.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="m-0 text-[13px] leading-normal text-fg-3">{t.noHomework}</p>
          )}

          {attention ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href={paths.classroom(attention.id)}
                className="flex items-center gap-3 rounded-[14px] border border-warning/35 bg-warning/8 px-3.5 py-3 text-fg no-underline hover:border-warning/60"
              >
                <TriangleAlert className="size-4 flex-none text-warning-fg" strokeWidth={2} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="text-sm break-words">{attention.name}</b>
                  <span className="text-[13px] leading-[1.45] text-fg-2">{attention.text}</span>
                </span>
                <ChevronRight className="size-4 flex-none text-fg-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              {moreAttention.length > 0 ? <span className="text-xs text-fg-3">{format(t.moreAttention, { count: moreAttention.length })}</span> : null}
            </div>
          ) : null}

          <Link
            href={routes.classes}
            className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-on-accent no-underline transition-[filter] hover:brightness-110"
          >
            {t.go}
          </Link>
        </>
      ) : (
        <>
          <ClassSteps stacked />
          <Link
            href={paths.newClass}
            className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-on-accent no-underline transition-[filter] hover:brightness-110"
          >
            <Plus className="size-[17px]" strokeWidth={2.4} aria-hidden="true" />
            {m.empty.first}
          </Link>
        </>
      )}
    </section>
  );
}
