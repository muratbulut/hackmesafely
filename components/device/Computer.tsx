"use client";

import { Copy, Minus, Square, Wifi, X } from "lucide-react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { AppIcon, StageWall, useClock, type StageApp } from "@/components/lab/stage/common";
import { LogoA } from "@/lib/brand";
import { cn } from "@/lib/utils";
import "./computer.css";

/**
 * Sitenin tek bilgisayarı (19 Kasım, Murat): gövde T2'deki masa monitörü, ekranı M1 masaüstü.
 * Odadaki bilgisayar (components/lab/stage/Desktop.tsx, T2 monitörü, okul bilgisayarı), öğretmenler turu ve
 * eğitim kartlarındaki Postam hep bu parçaları kullanır; yalnızca boyu (`k`) değişir, yeni
 * bilgisayar çizilmez. Ölçüler `computer.css`'te.
 */
export function Computer({
  k = 1,
  stand = false,
  inert,
  className,
  screenClassName,
  style,
  children,
}: {
  /** Ölçek: 1 odadaki bilgisayar; çerçeve, başlık ve görev çubuğu birlikte küçülür. */
  k?: number;
  /** Önden görünüşte boyun ve taban (masada üstten bakılan T2'de yok). */
  stand?: boolean;
  inert?: boolean;
  className?: string;
  screenClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn("dv-pc", className)} inert={inert} style={{ ["--pc-k" as string]: k, ...style }}>
      <div className="dv-pc-body">
        <div className={cn("dv-pc-screen", screenClassName)}>{children}</div>
      </div>
      {stand ? (
        <>
          <div className="dv-pc-neck" aria-hidden="true" />
          <div className="dv-pc-foot" aria-hidden="true" />
        </>
      ) : null}
    </div>
  );
}

export type TaskbarApp = {
  app: StageApp;
  label: string;
  open?: boolean;
  active?: boolean;
};

/**
 * Süs masaüstü (öğretmenler, eğitim kartı): duvar, ortada pencere(ler), altta görev çubuğu.
 * Hiçbir şeye tıklanmaz; odadaki etkileşimli masaüstü aynı başlığı ve görev çubuğunu kullanır.
 * `narrow`: pencere bütün masaüstünü kaplar (odadaki dar ekran gibi); "phone" yalnız telefon genişliğinde.
 */
export function ComputerDesktop({
  apps,
  narrow = false,
  areaClassName,
  children,
}: {
  apps: TaskbarApp[];
  narrow?: boolean | "phone";
  areaClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="dv-pc-desk" data-narrow={narrow}>
      <StageWall pattern={narrow === true ? "mobile" : "hero"} />
      <div className={cn("dv-pc-area", areaClassName)}>{children}</div>
      <Taskbar>
        {apps.map((a) => (
          <span key={a.label} className="dv-pc-task" data-open={a.open ?? true} data-active={a.active ?? false} aria-hidden="true">
            <AppIcon app={a.app} className="dv-pc-icon" />
            <span>{a.label}</span>
          </span>
        ))}
      </Taskbar>
    </div>
  );
}

/** Görev çubuğu: başlat (gözlü a), uygulamalar, kablosuz ve gerçek saat. */
export function Taskbar({ start, className, children }: { start?: ReactNode; className?: string; children: ReactNode }) {
  const clock = useClock();
  return (
    <div className={cn("dv-pc-bar", className)}>
      {start ?? (
        <span className="dv-pc-start" aria-hidden="true">
          <LogoA />
        </span>
      )}
      <div className="dv-pc-apps">{children}</div>
      <span className="dv-pc-tray" aria-hidden="true">
        <Wifi strokeWidth={2.2} />
        <span>
          <span data-testid="stage-clock">{clock.time}</span>
          <small>{clock.dateShort}</small>
        </span>
      </span>
    </div>
  );
}

/**
 * Pencere: koyu başlık (uygulama simgesi, ad, küçült/büyüt/kapat), beyaz gövde. Süs pencerede
 * düğmeler çizimdir; odadaki pencere `controls` ile gerçek düğmelerini verir.
 */
export function ComputerWindow({
  app,
  icon,
  title,
  active = true,
  controls,
  barProps,
  className,
  bodyClassName,
  site = false,
  children,
}: {
  app: StageApp;
  /** Uygulama simgesi yerine sistem penceresinin işareti (ör. güvenlik uyarısında kalkan). */
  icon?: ReactNode;
  title: string;
  active?: boolean;
  controls?: ReactNode;
  barProps?: HTMLAttributes<HTMLElement>;
  className?: string;
  bodyClassName?: string;
  /** Tarayıcıda bu site açık: içerik sitenin açık temasıyla çizilir (bilgisayarın uygulamaları açık renktir). */
  site?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("dv-pc-win", className)} aria-label={title}>
      <WindowBar
        app={app}
        icon={icon ? (cls) => <span className={cn(cls, "dv-pc-glyph")} aria-hidden="true">{icon}</span> : undefined}
        title={title}
        active={active}
        {...barProps}
      >
        {controls ?? <WindowControls />}
      </WindowBar>
      <div
        data-theme={site ? "gray" : undefined}
        className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", site ? "bg-surface text-fg" : "bg-scene-white", bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}

export function WindowBar({
  app,
  icon,
  title,
  active = true,
  className,
  children,
  ...rest
}: {
  app?: StageApp;
  /** Odanın kendi uygulama simgesi (ör. okul bilgisayarındaki not); verilmezse `app`. */
  icon?: (className: string) => ReactNode;
  title: string;
  active?: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <header className={cn("dv-pc-winbar", className)} data-active={active} {...rest}>
      {icon ? icon("dv-pc-icon") : <AppIcon app={app ?? "browser"} className="dv-pc-icon" />}
      <span className="dv-pc-wintitle">{title}</span>
      {children}
    </header>
  );
}

/** Süs pencere düğmeleri. */
export function WindowControls({ max = false }: { max?: boolean }) {
  return (
    <span className="dv-pc-winctl" aria-hidden="true">
      <span>
        <Minus strokeWidth={2} />
      </span>
      <span>{max ? <Copy strokeWidth={2} /> : <Square strokeWidth={2} />}</span>
      <span>
        <X strokeWidth={2} />
      </span>
    </span>
  );
}
