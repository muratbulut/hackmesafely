import { Activity, Flame, ShieldCheck, Sun, UserPlus, type LucideIcon } from "lucide-react";
import { DistrictGlyph, toneOf } from "@/components/roadmap/NeighborhoodIcon";
import type { PulseData } from "@/lib/admin/pulse";
import { liveWindowMinutes } from "@/lib/admin/pulse-model";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PrivacyNote } from "../overview/PrivacyNote";
import { Present, PresentButton } from "./Present";
import { PulseFeed } from "./PulseFeed";
import { LiveControls, PulseRefresher } from "./PulseRefresher";

const nf = (n: number) => n.toLocaleString("tr-TR");

/**
 * Canlı nabız, "Sahne" tasarımı (17 Kasım, Murat): ortada tek büyük sayı, mahalleler rozet gibi,
 * altında günün saat saat çubuğu, sonra son 1 saat + bugün ve isimsiz akış. Yansıtmak için büyük,
 * isimsiz; "Tam ekran" ile sunum modu. Kimse yokken büyük 0 yerine sakin hâl: son hareket ve
 * bugünün toplamı. 15 saniyede bir yenilenir. En çok tuzağa düşülen odalar yalnızca Özet'te.
 */
export function PulseView({ data }: { data: PulseData }) {
  const t = getMessages().adminPulse;
  const quiet = data.live === 0;

  return (
    <PulseRefresher>
      <Present>
        <main className="flex flex-col gap-4 px-4 pt-4 pb-10 lg:gap-6 lg:px-9 lg:pt-8 lg:pb-[72px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 font-heading text-[26px] leading-[1.1] font-bold lg:text-[34px]">{t.title}</h1>
              <p className="m-0 text-sm text-fg-3 lg:text-[15px]">{t.intro}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LiveControls />
              <PresentButton />
            </div>
          </div>

          <section
            aria-label={t.live}
            className={cn(
              "relative overflow-hidden rounded-[28px] border bg-surface px-6 py-8 text-center lg:px-10 lg:py-12",
              quiet ? "border-line" : "border-success/40",
            )}
          >
            {quiet ? null : (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--color-success)_16%,transparent),transparent_70%)]"
              />
            )}
            {quiet ? (
              <div className="relative flex flex-col items-center gap-3" data-testid="pulse-quiet">
                <span className="flex size-16 items-center justify-center rounded-full bg-surface-deep text-fg-3">
                  <Sun className="size-8" aria-hidden="true" />
                </span>
                <b className="font-heading text-[28px] leading-tight lg:text-[40px]">{t.quiet.title}</b>
                <span className="text-[15px] text-fg-3">
                  {data.lastActivity ? format(t.quiet.last, { ago: data.lastActivity }) : t.quiet.none}
                  {" · "}
                  {format(t.quiet.today, { finished: nf(data.today.finished), safe: nf(data.today.safe) })}
                </span>
              </div>
            ) : (
              <div className="relative flex flex-col items-center gap-2">
                <b className="font-heading text-[120px] leading-[0.85] tabular-nums text-success-fg lg:text-[180px]" data-testid="pulse-live">
                  {nf(data.live)}
                </b>
                <span className="text-[18px] text-fg-2 lg:text-[24px]">{t.liveCount}</span>
                <span className="text-xs text-fg-4">{format(t.liveHint, { n: liveWindowMinutes })}</span>
              </div>
            )}
            <ul aria-label={t.byNeighborhood} className="relative m-0 mt-7 flex list-none flex-wrap justify-center gap-2 p-0">
              {data.neighborhoods.map((n) => {
                const tone = toneOf(n.color);
                return (
                  <li
                    key={n.name}
                    className={cn("flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm", n.count > 0 ? tone.chip : "border-card opacity-60")}
                  >
                    <span className="sr-only">{format(t.neighborhoodCount, { name: n.name, n: n.count })}</span>
                    <DistrictGlyph icon={n.icon} className={cn("size-4", tone.text)} aria-hidden="true" />
                    <span aria-hidden="true" className="font-bold">
                      {n.name}
                    </span>
                    <b aria-hidden="true" className={cn("tabular-nums", tone.text)}>
                      {nf(n.count)}
                    </b>
                  </li>
                );
              })}
            </ul>
          </section>

          <HourlyBar today={data.today} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
              <span className="text-xs font-bold tracking-[0.8px] text-fg-4">{t.lastHour}</span>
              <span className="flex items-baseline gap-2">
                <b className="font-heading text-[40px] leading-none tabular-nums" data-testid="pulse-hour">
                  {nf(data.hour.finished)}
                </b>
                <span className="text-sm text-fg-3">{t.finishedInHour}</span>
              </span>
              <Spark values={data.hour.buckets} label={format(t.spark, { values: data.hour.buckets.join(", ") })} />
              <span className="border-t border-card pt-3 text-xs font-bold tracking-[0.8px] text-fg-4">{t.today.label}</span>
              <div className="flex flex-col gap-2.5" data-testid="pulse-today">
                <Stat icon={Activity} value={nf(data.today.finished)} label={t.today.finished} />
                <Stat icon={ShieldCheck} value={nf(data.today.safe)} label={t.today.safe} tone="text-success-fg" />
                <Stat icon={Flame} value={nf(data.today.hacked)} label={t.today.hacked} tone="text-danger-fg" />
                <Stat icon={UserPlus} value={nf(data.today.signups)} label={t.today.signups} tone="text-purple-fg" />
              </div>
            </section>
            <PulseFeed items={data.feed} />
          </div>
          <PrivacyNote />
        </main>
      </Present>
    </PulseRefresher>
  );
}

/** Son 1 saat, 5 dakikalık 12 dilim. */
function Spark({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={label} className="flex h-14 items-end gap-[3px]">
      {values.map((value, i) => (
        <span
          key={i}
          className={cn("block flex-1 rounded-[3px]", i === values.length - 1 ? "bg-accent" : "bg-accent/35")}
          style={{ height: `${Math.max(6, Math.round((value / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

/** Bugün saat saat biten odalar (Bugünün tahtası tasarımından alınan çubuk); şu anki saat dolu renk, gelecek saatler soluk. */
function HourlyBar({ today }: { today: PulseData["today"] }) {
  const t = getMessages().adminPulse.hourly;
  const max = Math.max(1, ...today.hours);
  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5" data-testid="pulse-hourly">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-base font-bold">{t.title}</h2>
        <span className="text-xs text-fg-4">{today.peak ? format(t.peak, { hour: today.peak }) : t.noPeak}</span>
      </span>
      <div role="img" aria-label={format(t.chart, { values: today.hours.join(", ") })} className="flex h-[110px] items-end gap-[2px] lg:h-[130px] lg:gap-1">
        {today.hours.map((value, hour) => (
          <span key={hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span
              className={cn("block w-full rounded-t-[3px]", hour === today.nowHour ? "bg-accent" : hour > today.nowHour ? "bg-card" : "bg-accent/40")}
              style={{ height: `${Math.max(3, Math.round((value / max) * 100))}%` }}
            />
            <span aria-hidden="true" className={cn("text-[10px] tabular-nums", hour % 3 ? "invisible" : "text-fg-4", hour % 6 && "max-sm:invisible")}>
              {String(hour).padStart(2, "0")}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label, tone = "text-fg" }: { icon: LucideIcon; value: string; label: string; tone?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Icon className={cn("size-[18px] flex-none", tone)} aria-hidden="true" />
      <b className={cn("font-heading text-[22px] leading-none tabular-nums", tone)}>{value}</b>
      <span className="text-[13px] text-fg-3">{label}</span>
    </span>
  );
}
