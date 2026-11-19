"use client";

import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useClock } from "@/components/lab/stage/common";
import { cn } from "@/lib/utils";
import { useDragScroll } from "./drag-scroll";
import "./phone.css";

/**
 * Sitenin tek telefonu (19 Kasım, Murat): odalarda masadaki telefon, gelen arama, SMS, oda kapağı,
 * hacklendin ekranı, tanıtım ve öğretmenler sayfası hep bu gövdeyi ve bu durum çubuğunu kullanır;
 * yalnızca boy (`height`) değişir. Ölçüler `phone.css`'te, masadaki telefondan (oda sahne şablonu).
 */
export function Phone({
  height,
  status = "light",
  className,
  screenClassName,
  style,
  children,
}: {
  /** CSS boyu (ör. "430px", "min(620px, calc(100dvh - 48px))"); en 9:19 oranla gelir. Verilmezse sınıftan (`[--dv-h:...]`). */
  height?: string;
  /** light: açık durum çubuğu, dark: koyu ekranın üstünde, clear: uygulamanın renginde, none: yok. */
  status?: "light" | "dark" | "clear" | "none";
  className?: string;
  screenClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  useDragScroll();
  return (
    <div className={cn("dv-phone", className)} style={height ? { ["--dv-h" as string]: height, ...style } : style}>
      <div className={cn("dv-screen", screenClassName)}>
        {status === "none" ? null : <PhoneStatus tone={status} />}
        {children}
      </div>
    </div>
  );
}

/** Telefonun durum çubuğu: saat (gerçek saat ya da verilen), sinyal, kablosuz, pil. */
export function PhoneStatus({ tone = "light", time, className }: { tone?: "light" | "dark" | "clear"; time?: string; className?: string }) {
  const clock = useClock();
  return (
    <div aria-hidden="true" className={cn("dv-status", tone === "dark" && "dv-status-dark", tone === "clear" && "dv-status-clear", className)}>
      <span>{time ?? clock.time}</span>
      <span className="dv-status-icons">
        <Signal strokeWidth={2.6} />
        <Wifi strokeWidth={2.6} />
        <BatteryFull strokeWidth={2.2} />
      </span>
    </div>
  );
}

/** Kilit ekranı: masadaki telefonun uyku ekranı gibi büyük saat ve tarih, altında bildirimler. */
export function PhoneLock({ time, date, children }: { time?: string; date?: string; children?: ReactNode }) {
  const clock = useClock();
  return (
    <div className="dv-lock">
      <span className="dv-lock-time">{time ?? clock.time}</span>
      <span className="dv-lock-date">{date ?? clock.dateLong}</span>
      {children}
    </div>
  );
}
