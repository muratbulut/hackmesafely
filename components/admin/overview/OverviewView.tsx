import { AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, GraduationCap, Newspaper, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { OverviewData } from "@/lib/admin/overview";
import type { AreaKey, Tone } from "@/lib/admin/overview-model";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PrivacyNote } from "./PrivacyNote";
import { TrapList } from "./TrapList";
import { WeeklyChart } from "./WeeklyChart";

/** Alanın rengi: turuncu iş var, sarı göz at, yeşil yolunda (yolunda alanın çerçevesi sade). */
const toneStyle: Record<Tone, { chip: string; ring: string; dot: string }> = {
  work: { chip: "bg-orange/15 text-orange-fg", ring: "border-orange/60", dot: "bg-orange" },
  watch: { chip: "bg-warning/15 text-warning-fg", ring: "border-warning/50", dot: "bg-warning" },
  good: { chip: "bg-success/15 text-success-fg", ring: "border-line", dot: "bg-success" },
};

const areaIcons: Record<AreaKey, LucideIcon> = { applications: GraduationCap, students: Users, content: Newspaper, labs: FlaskConical };

function ToneChip({ tone }: { tone: Tone }) {
  return (
    <span className={cn("inline-flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap", toneStyle[tone].chip)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", toneStyle[tone].dot)} />
      {getMessages().adminOverview.tones[tone]}
    </span>
  );
}

/**
 * Yönetim özeti, Durum karnesi (17 Kasım, Murat A'yı seçti). Üstte tek cümle (kaç iş var, kaç alan
 * yolunda), altında dört alan kartı (Talepler, Öğrenciler, Gündem ve ipucu, Odalar; her birinde
 * trafik ışığı ve gidilecek sayfa), en altta son 6 haftanın grafiği ve en çok tuzağa düşülen odalar.
 * İzni olmayan alan çıkmaz. Telefonda hepsi alt alta. Her şey toplam sayıdır.
 */
export function OverviewView({ data }: { data: OverviewData }) {
  const t = getMessages().adminOverview;
  const VerdictIcon = data.verdict.tone === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <main className="flex flex-col gap-4 px-4 pt-4 pb-10 lg:gap-6 lg:px-9 lg:pt-8 lg:pb-[72px]">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs tracking-[0.8px] text-fg-4">{data.eyebrow}</span>
        <h1 className="m-0 font-heading text-[26px] leading-[1.1] font-bold lg:text-[34px]">{t.title}</h1>
        <p className="m-0 max-w-[720px] text-sm leading-[1.55] text-fg-3 lg:text-[15px]">{t.intro}</p>
      </div>

      <section
        data-testid="overview-verdict"
        data-tone={data.verdict.tone}
        className={cn("flex flex-col gap-4 rounded-[22px] border-2 bg-surface p-5 lg:flex-row lg:items-center lg:gap-6 lg:p-7", toneStyle[data.verdict.tone].ring)}
      >
        <span className={cn("flex size-14 flex-none items-center justify-center rounded-2xl", toneStyle[data.verdict.tone].chip)}>
          <VerdictIcon className="size-8" aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-1.5">
          <b className="font-heading text-[22px] leading-tight lg:text-[28px]">{data.verdict.title}</b>
          <span className="text-sm text-fg-3 lg:text-[15px]">{data.verdict.sub}</span>
        </span>
      </section>

      <section aria-label={t.areasLabel} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
        {data.areas.map((area) => {
          const Icon = areaIcons[area.key];
          return (
            <Link
              key={area.key}
              href={area.href}
              data-testid={`area-${area.key}`}
              data-tone={area.tone}
              className={cn(
                "group flex flex-col gap-3 rounded-[20px] border-2 bg-surface p-5 text-fg no-underline hover:bg-surface-raised",
                toneStyle[area.tone].ring,
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-fg-2">
                  <Icon className="size-[18px] flex-none" aria-hidden="true" />
                  {area.name}
                </span>
                <ToneChip tone={area.tone} />
              </span>
              <span className="flex items-baseline gap-2">
                <b className="font-heading text-[40px] leading-none">{area.value}</b>
                <span className="text-sm text-fg-3">{area.unit}</span>
              </span>
              <span className="text-[13px] leading-[1.45] text-fg-3">{area.line}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-accent-fg">
                {area.go}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <WeeklyChart bars={data.chart} noticed={data.noticed} />
        <TrapList traps={data.traps} />
      </div>
      <PrivacyNote />
    </main>
  );
}
