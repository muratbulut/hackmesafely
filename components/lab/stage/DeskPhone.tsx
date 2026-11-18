"use client";

import { BatteryFull, Signal, Wifi } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AppIcon, useClock, type StageApp } from "./common";

export type PhoneNotice = {
  app: StageApp;
  title: string;
  text: string;
  key: number;
};

/**
 * Masadaki telefon (T1, T2, oda sahne şablonu): telefon hiçbir zaman doğrudan ekranı kaplamaz.
 * Masada yatarken ekranı kararmıştır, saat ve gelen bildirim görünür; dokununca öğrenci telefonu
 * alır (ortaya gelir, büyür), işi bitince "Masaya bırak" der. Uygulama hep çizili kalır (açık
 * konuşma kaybolmasın); masadayken dokunulamaz. Bildirim gelince telefon titrer ve parlar
 * ("Hareketi azalt" açıksa titremez). Yerini ve boyunu sahne verir (stage.css, data-place).
 */
export function DeskPhone({
  place,
  inHand,
  onPick,
  onDrop,
  notice,
  children,
  screenRef,
}: {
  place: "t1" | "t2";
  inHand: boolean;
  onPick: () => void;
  onDrop: () => void;
  notice: PhoneNotice | null;
  children: ReactNode;
  /** Ekranın kendisi (T2'de velinin SMS'i buraya çizilir). */
  screenRef?: Ref<HTMLDivElement>;
}) {
  const t = getMessages().lab.stage.phone;
  const clock = useClock();
  const body = useRef<HTMLDivElement>(null);
  const [buzzing, setBuzzing] = useState(false);

  // Yeni bildirimde titreşim: animasyon her bildirimde baştan başlar.
  useEffect(() => {
    if (!notice) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- titreşim bildirimle başlar
    setBuzzing(false);
    const start = window.requestAnimationFrame(() => setBuzzing(true));
    const stop = window.setTimeout(() => setBuzzing(false), 1600);
    return () => {
      window.cancelAnimationFrame(start);
      window.clearTimeout(stop);
    };
  }, [notice]);

  return (
    <>
      {!inHand && notice ? (
        <span className="st-deskhint" data-place={place} aria-hidden="true">
          {t.pick}
        </span>
      ) : null}
      <div
        className="st-handset"
        data-place={place}
        data-hand={inHand ? "true" : "false"}
        data-testid="stage-phone"
        role={inHand ? "group" : undefined}
        aria-label={inHand ? undefined : t.label}
      >
        <div ref={body} className={cn("st-phone-body", buzzing && "st-buzz", notice && !inHand && "st-glow")}>
          <div className="st-phone-screen">
            <div className="flex h-11 flex-none items-center justify-between bg-scene-paper px-5 text-[13px] font-bold text-scene-ink">
              <span aria-hidden="true">{clock.time}</span>
              {inHand ? (
                <button
                  type="button"
                  onClick={onDrop}
                  className="-mr-2 flex min-h-10 cursor-pointer items-center rounded-full border border-scene-line-strong bg-scene-white px-3 text-xs font-bold text-scene-ink"
                  data-testid="stage-phone-drop"
                >
                  {t.drop}
                </button>
              ) : (
                <span className="flex items-center gap-1" aria-hidden="true">
                  <Signal className="size-3.5" strokeWidth={2.6} />
                  <Wifi className="size-3.5" strokeWidth={2.6} />
                  <BatteryFull className="size-4" strokeWidth={2.2} />
                </span>
              )}
            </div>
            <div ref={screenRef} inert={!inHand} data-device="phone" className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-scene-white">
              {children}
            </div>
            {inHand ? null : (
              <button
                type="button"
                onClick={onPick}
                className="st-sleep"
                aria-label={notice ? `${t.pick}: ${notice.title}` : t.pick}
                data-testid="stage-phone-pick"
              >
                <span className="font-heading text-[64px] leading-none font-medium tabular-nums">{clock.time}</span>
                <span className="text-[15px] text-stage-os-fg-2 first-letter:uppercase">{clock.dateLong}</span>
                {notice ? (
                  <span key={notice.key} className="st-sleep-card">
                    <AppIcon app={notice.app} className="size-9" />
                    <span className="min-w-0 flex-1 text-left">
                      <b className="block truncate text-sm">{notice.title}</b>
                      <span className="line-clamp-2 block text-[13px] text-stage-os-fg-2">{notice.text}</span>
                    </span>
                    <span className="self-start text-[11px] text-stage-os-muted">{t.now}</span>
                  </span>
                ) : null}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
