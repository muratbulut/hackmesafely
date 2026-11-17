import type { ChartBar } from "@/lib/admin/overview-model";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Son 6 haftada biten oda (Durum karnesi). Çubuklar düz kutudur (kütüphane yok); son çubuk bu hafta
 * ve hafta bitmediği için taralı. Altında ilk denemede tuzağı fark eden (10 denemeden azsa yüzde
 * yok). Ekran okuyucu için sayılar etikette yazılıdır.
 */
export function WeeklyChart({ bars, noticed }: { bars: ChartBar[]; noticed: { value: string; sub: string } }) {
  const t = getMessages().adminOverview;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const label = `${t.chart.label}. ${bars.map((b) => format(t.chart.bar, { week: b.label, n: b.display })).join(", ")}`;
  return (
    <section data-testid="overview-chart" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 lg:p-5">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-base font-bold lg:text-[17px]">{t.chart.heading}</h2>
        <span className="text-xs text-fg-4">{t.chart.note}</span>
      </span>
      <div role="img" aria-label={label} className="flex h-[156px] items-end gap-2 lg:gap-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* Sayı çubuğun hemen üstünde; çubuğun boyu sayıya yer bırakarak hesaplanır. */}
            <span className="flex w-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className={cn("text-[11px] font-bold", bar.current ? "text-fg" : "text-fg-3")}>{bar.display}</span>
              <span
                className={cn(
                  "block w-full max-w-[54px] rounded-t-md",
                  bar.current
                    ? "border-2 border-dashed border-accent bg-[repeating-linear-gradient(135deg,var(--color-accent)_0_3px,transparent_3px_8px)] opacity-80"
                    : "bg-accent/40",
                )}
                style={{ height: `max(4px, calc(${Math.round((bar.value / max) * 100)}% - 22px))` }}
              />
            </span>
            <span className={cn("text-[11px] whitespace-nowrap", bar.current ? "font-bold text-accent-fg" : "text-fg-4")}>
              {bar.current ? format(t.chart.ongoing, { week: bar.label }) : bar.label}
            </span>
          </div>
        ))}
      </div>
      <span data-testid="overview-noticed" className="text-xs text-fg-3">
        {t.noticed.label} <b className="text-fg">{noticed.value}</b> · {noticed.sub}
      </span>
    </section>
  );
}
