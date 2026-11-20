"use client";

import { CircleAlert, CircleCheck, PackageSearch } from "lucide-react";
import { useState } from "react";
import type { ClientItem } from "@/lib/lab/client";
import type { ParcelResult } from "@/lib/lab/story";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AppIcon } from "../stage/common";

/**
 * Takip görevinde kargo firmasının kendi uygulaması (kurgusal "Yolda Kargo"; masaüstünde ayrı
 * pencere). Öğrenci açtığı maillerdeki takip numaralarından birini seçer (yazmaz) ve sorgular.
 * Hangi numaranın gerçek gönderi olduğu tarayıcıda bilinmez; sonucu sürücü söyler: durum ve
 * adımlar ya da "bulunamadı". Uygulama hiçbir ağ isteği yapmaz.
 */
export function ParcelTracker({
  app,
  sub,
  items,
  onQuery,
}: {
  app: string;
  sub: string;
  /** Açılmış ve takip numarası olan mailler. */
  items: ClientItem[];
  onQuery: (itemId: string) => Promise<ParcelResult | null>;
}) {
  const t = getMessages().lab.track;
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ item: string; value: ParcelResult } | null>(null);

  async function query() {
    if (!pick || busy) return;
    setBusy(true);
    const value = await onQuery(pick);
    setBusy(false);
    if (value) setResult({ item: pick, value });
  }

  const shown = result && result.item === pick ? result.value : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-scene-paper text-scene-ink" data-testid="parcel-tracker">
      <div className="flex flex-none items-center gap-2.5 bg-scene-violet px-4 py-3 text-scene-white">
        <AppIcon app="parcel" className="size-8 border border-scene-white/30" />
        <span className="flex min-w-0 flex-col">
          <b className="truncate text-[16px]">{app}</b>
          {sub ? <small className="text-[12px] text-scene-white/80">{sub}</small> : null}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <span className="text-[12px] font-bold tracking-[0.06em] text-scene-ink-muted uppercase">{t.found}</span>
        {items.length === 0 ? (
          <p className="flex items-start gap-2 rounded-xl border border-dashed border-scene-line-strong bg-scene-white p-3 text-sm text-scene-ink-2">
            <PackageSearch className="mt-0.5 size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            {t.none}
          </p>
        ) : (
          <div role="radiogroup" aria-label={t.found} className="flex flex-col gap-2">
            {items.map((item) => {
              const on = pick === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(item.id)}
                  className={cn(
                    "flex min-h-12 cursor-pointer flex-col items-start gap-0.5 rounded-xl border bg-scene-white px-3 py-2 text-left",
                    on ? "border-scene-violet ring-2 ring-scene-violet/30" : "border-scene-line-strong hover:border-scene-ink-2",
                  )}
                  data-testid="parcel-number"
                >
                  <b className="font-mono text-[15px] tracking-[0.04em]">{item.tracking}</b>
                  <small className="truncate text-[12px] text-scene-ink-muted">{format(t.from, { subject: item.subject })}</small>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={query}
          disabled={!pick || busy}
          className="min-h-11 cursor-pointer rounded-xl bg-scene-violet font-bold text-scene-white disabled:cursor-default disabled:opacity-45"
          data-testid="parcel-query"
        >
          {busy ? t.querying : t.query}
        </button>
        {items.length > 0 && !pick ? <p className="text-center text-xs text-scene-ink-muted">{t.pick}</p> : null}

        {shown?.found ? (
          <div className="flex flex-col gap-3 rounded-xl border border-scene-green/40 bg-scene-white p-3 [animation:fade-up_.3s_ease-out_both]" data-testid="parcel-found">
            <b className="flex items-center gap-2 text-scene-green">
              <CircleCheck className="size-5" strokeWidth={2.2} aria-hidden="true" />
              {shown.title}
            </b>
            {shown.text ? <p className="text-[13px] text-scene-ink-2">{shown.text}</p> : null}
            <ol className="flex flex-col gap-2.5">
              {shown.steps.map((step, i) => {
                const last = i === shown.steps.length - 1;
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <i aria-hidden="true" className={cn("mt-1 size-3 flex-none rounded-full border-2", last ? "border-scene-violet bg-scene-white" : "border-scene-violet bg-scene-violet")} />
                    <span className="flex flex-col text-[13.5px]">
                      <b className={last ? "text-scene-violet" : ""}>{step.title}</b>
                      {step.note ? <small className="text-[12px] text-scene-ink-muted">{step.note}</small> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : shown ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-scene-red/40 bg-scene-red-soft p-3 [animation:fade-up_.3s_ease-out_both]" data-testid="parcel-missing">
            <b className="flex items-center gap-2 text-scene-red">
              <CircleAlert className="size-5" strokeWidth={2.2} aria-hidden="true" />
              {shown.title}
            </b>
            {shown.text ? <p className="text-[13px] text-scene-ink-2">{shown.text}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
