"use client";

import { Taskbar, WindowBar } from "@/components/device/Computer";
import { Copy, Globe, ImageIcon, Minus, Square, StickyNote, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { StageWall, useClock } from "../stage/common";

export type LoginWinId = "browser" | "note" | "image";
export const loginWinIds: LoginWinId[] = ["browser", "note", "image"];

export type LoginWin = {
  open: boolean;
  min: boolean;
  /** Pencerenin başlığı, görev çubuğundaki kısa adı ve içeriği. */
  title: string;
  label: string;
  node: ReactNode;
};

type Rect = { x: number; y: number; w: number; h: number };

/** Pencerelerin ilk yeri, masaüstünün yüzdesi olarak: not solda küçük, tarayıcı geniş, resim ortada. */
const firstRect: Record<LoginWinId, Rect> = {
  note: { x: 5, y: 7, w: 46, h: 72 },
  browser: { x: 12, y: 3, w: 84, h: 94 },
  image: { x: 22, y: 6, w: 52, h: 86 },
};
const MIN_W = 24;
const MIN_H = 26;
/** Bu genişlikten dar masaüstünde pencereler hep tam boy açılır (telefon, küçük ekran). */
const NARROW_PX = 760;

const icons: Record<LoginWinId, { Icon: LucideIcon; tone: string }> = {
  browser: { Icon: Globe, tone: "bg-scene-blue" },
  note: { Icon: StickyNote, tone: "bg-scene-amber" },
  image: { Icon: ImageIcon, tone: "bg-scene-violet" },
};

/** Okul bilgisayarındaki uygulamaların simgesi: tarayıcı mavi küre, not sarı, resim mor. */
export function LoginAppIcon({ id, className }: { id: LoginWinId; className?: string }) {
  const { Icon, tone } = icons[id];
  return (
    <span aria-hidden="true" className={cn("flex flex-none items-center justify-center rounded-[22%] text-scene-white", tone, className)}>
      <Icon className="size-[58%]" strokeWidth={2.2} />
    </span>
  );
}

const resizeDirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type Dir = (typeof resizeDirs)[number];
const dirClass: Record<Dir, string> = {
  n: "top-0 inset-x-2 h-1.5 cursor-ns-resize",
  s: "bottom-0 inset-x-2 h-1.5 cursor-ns-resize",
  e: "right-0 inset-y-2 w-1.5 cursor-ew-resize",
  w: "left-0 inset-y-2 w-1.5 cursor-ew-resize",
  ne: "top-0 right-0 size-3 cursor-nesw-resize",
  nw: "top-0 left-0 size-3 cursor-nwse-resize",
  se: "bottom-0 right-0 size-3 cursor-nwse-resize",
  sw: "bottom-0 left-0 size-3 cursor-nesw-resize",
};

export type LoginDesktopProps = {
  /** Bilgisayarın adı: kilit ekranında ve sağ üstte ("Bilişim Sınıfı · PC 12"). */
  computer: string;
  /** Kilit ekranında hesabın adı ("Öğrenci") ve öğrencinin kendi avatarı (profildeki emoji). */
  owner: string;
  avatar: string;
  unlocked: boolean;
  onUnlock: () => void;
  wins: Record<LoginWinId, LoginWin>;
  /** Öne getirilecek pencere; `n` her istekte artar. */
  front: { id: LoginWinId; n: number } | null;
  onOpen: (id: LoginWinId) => void;
  onClose: (id: LoginWinId) => void;
  onMin: (id: LoginWinId) => void;
  /** Masaüstündeki simgeler (resim penceresi yalnızca açılınca görev çubuğuna gelir). */
  desktopIcons: { id: LoginWinId; label: string }[];
};

/**
 * Okul bilgisayarının masaüstü (Şehir Kapısı, okul bilgisayarı; M1 masaüstünün sınıftaki hâli):
 * herkesin ortak hesabı, kilit ekranında öğrencinin kendi avatarı. Pencereler (tarayıcı, öğretmenin
 * notu, resim) taşınır, kenarından büyütülür, küçülür, kapanır; dar ekranda hep tam boydur.
 * Başlat menüsünde "Oturumu kapat" yok: bilgisayarı bırakmak zil çalınca yapılan karardır.
 */
export function LoginDesktop({ computer, owner, avatar, unlocked, onUnlock, wins, front, onOpen, onClose, onMin, desktopIcons }: LoginDesktopProps) {
  const t = getMessages().lab;
  const clock = useClock();
  const layer = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [rects, setRects] = useState(firstRect);
  const [max, setMax] = useState<Record<LoginWinId, boolean>>({
    browser: false,
    note: false,
    image: false,
  });
  const [z, setZ] = useState<Record<LoginWinId, number>>({
    note: 1,
    browser: 2,
    image: 0,
  });
  const [focus, setFocus] = useState<LoginWinId | null>(null);
  const zTop = useRef(3);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW_PX));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function raise(id: LoginWinId) {
    setZ((all) => ({ ...all, [id]: ++zTop.current }));
    setFocus(id);
  }

  // Sahne bir pencereyi öne istedi (not açıldı, tarayıcı geldi).
  useEffect(() => {
    if (!front) return;
    // Öne getirme isteği dışarıdan gelir.
    setZ((all) => ({ ...all, [front.id]: ++zTop.current }));
    setFocus(front.id);
  }, [front]);

  // Kapanan ya da küçülen pencerenin odağı en üstteki açık pencereye geçer.
  const visible = loginWinIds.filter((id) => wins[id].open && !wins[id].min);
  const active = focus && visible.includes(focus) ? focus : (visible.sort((a, b) => z[b] - z[a])[0] ?? null);

  function taskbarClick(id: LoginWinId) {
    if (wins[id].open && !wins[id].min && active === id) onMin(id);
    else {
      onOpen(id);
      raise(id);
    }
  }

  // Başlıktan sürükleme ve kenardan büyütme (geniş masaüstünde, tam boy değilken).
  function drag(id: LoginWinId, e: ReactPointerEvent<HTMLElement>, dir: Dir | null) {
    if ((!dir && (e.target as HTMLElement).closest("button")) || narrow || max[id] || !layer.current) return;
    e.preventDefault();
    const box = layer.current.getBoundingClientRect();
    const r0 = rects[id];
    const sx = e.clientX;
    const sy = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    if (active !== id) raise(id);
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / box.width) * 100;
      const dy = ((ev.clientY - sy) / box.height) * 100;
      const r = { ...r0 };
      if (!dir) {
        r.x = Math.max(-r0.w + 12, Math.min(88, r0.x + dx));
        r.y = Math.max(0, Math.min(90, r0.y + dy));
      } else {
        if (dir.includes("e")) r.w = Math.max(MIN_W, Math.min(100 - r0.x, r0.w + dx));
        if (dir.includes("s")) r.h = Math.max(MIN_H, Math.min(100 - r0.y, r0.h + dy));
        if (dir.includes("w")) {
          const nx = Math.max(0, Math.min(r0.x + r0.w - MIN_W, r0.x + dx));
          r.w = r0.w + (r0.x - nx);
          r.x = nx;
        }
        if (dir.includes("n")) {
          const ny = Math.max(0, Math.min(r0.y + r0.h - MIN_H, r0.y + dy));
          r.h = r0.h + (r0.y - ny);
          r.y = ny;
        }
      }
      setRects((all) => ({ ...all, [id]: r }));
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  }

  const toggleMax = (id: LoginWinId) => setMax((all) => ({ ...all, [id]: !all[id] }));
  const inBar = loginWinIds.filter((id) => id !== "image" || wins.image.open);

  return (
    <div
      className="st-desktop relative flex min-h-0 flex-1 flex-col overflow-hidden text-stage-os-fg"
      aria-label={format(t.stage.desktop, { owner })}
      role="region"
      data-testid="stage-desktop"
    >
      <StageWall pattern={narrow ? "mobile" : "hero"} />
      <span
        aria-hidden="true"
        className="absolute top-2.5 right-3 rounded-md border border-stage-os-line bg-stage-lock-scrim px-2 py-0.5 text-[11.5px] text-stage-os-fg-2 max-lg:hidden"
      >
        {computer}
      </span>

      {unlocked ? (
        <nav aria-label={t.stage.desktopIcons} className="absolute top-3 left-3 z-[1] flex flex-col gap-1.5 max-lg:hidden">
          {desktopIcons.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onOpen(id);
                raise(id);
              }}
              className="flex w-[92px] cursor-pointer flex-col items-center gap-1.5 rounded-[10px] px-1 py-2 text-center text-[12.5px] leading-tight [text-shadow:0_1px_3px_var(--stage-shadow)] hover:bg-stage-os-hover"
              data-testid={`login-icon-${id}`}
            >
              <LoginAppIcon id={id} className="size-[44px]" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      ) : null}

      <div ref={layer} className="pointer-events-none absolute inset-x-0 top-0 bottom-[46px] z-[2]">
        {loginWinIds.map((id) => {
          const w = wins[id];
          const full = max[id] || narrow;
          const r = rects[id];
          const on = active === id;
          return (
            <section
              key={id}
              hidden={!w.open || w.min}
              aria-label={w.title}
              data-testid={`login-window-${id}`}
              onPointerDownCapture={() => active !== id && raise(id)}
              className={cn(
                "pointer-events-auto absolute flex flex-col overflow-hidden bg-scene-white text-scene-ink",
                full ? "rounded-none" : "rounded-[10px] border border-stage-os-line",
                on ? "shadow-[0_18px_50px_var(--stage-os-shadow)]" : "shadow-[0_10px_30px_var(--stage-shadow-soft)]",
              )}
              style={
                full
                  ? { inset: 0, zIndex: z[id] }
                  : {
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      width: `${r.w}%`,
                      height: `${r.h}%`,
                      zIndex: z[id],
                    }
              }
            >
              {full
                ? null
                : resizeDirs.map((dir) => (
                    <span key={dir} aria-hidden="true" onPointerDown={(e) => drag(id, e, dir)} className={cn("absolute z-[3] touch-none", dirClass[dir])} />
                  ))}
              <WindowBar
                icon={(cls) => <LoginAppIcon id={id} className={cls} />}
                title={w.title}
                active={on}
                onPointerDown={(e) => drag(id, e, null)}
                onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && !narrow && toggleMax(id)}
                className={cn("touch-none", !full && "cursor-grab")}
              >
                <span className="flex">
                  <WinButton label={t.stage.window.min} onClick={() => onMin(id)}>
                    <Minus className="size-4" strokeWidth={2} />
                  </WinButton>
                  {!narrow ? (
                    <WinButton label={full ? t.stage.window.restore : t.stage.window.max} onClick={() => toggleMax(id)}>
                      {full ? <Copy className="size-3.5" strokeWidth={2} /> : <Square className="size-3.5" strokeWidth={2} />}
                    </WinButton>
                  ) : null}
                  <WinButton label={t.stage.window.close} onClick={() => onClose(id)} danger testId={`login-close-${id}`}>
                    <X className="size-4" strokeWidth={2} />
                  </WinButton>
                </span>
              </WindowBar>
              <div inert={!w.open || w.min} className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-scene-white">
                {w.node}
              </div>
            </section>
          );
        })}
      </div>

      <Taskbar className="absolute inset-x-0 bottom-0">
        {unlocked ? (
          <div role="group" aria-label={t.stage.openApps}>
            {inBar.map((id) => {
              const w = wins[id];
              const isActive = active === id && w.open && !w.min;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  data-open={w.open}
                  data-active={isActive}
                  onClick={() => taskbarClick(id)}
                  className="dv-pc-task cursor-pointer hover:bg-stage-os-hover"
                  data-testid={`login-taskbar-${id}`}
                >
                  <LoginAppIcon id={id} className="dv-pc-icon" />
                  <span className="max-sm:hidden">{w.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </Taskbar>

      {unlocked ? null : (
        <LockScreen time={clock.time} date={clock.dateLong} avatar={avatar} owner={owner} detail={`${computer} · ${t.login.shared}`} onUnlock={onUnlock} />
      )}
    </div>
  );
}

function WinButton({
  label,
  onClick,
  danger,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid h-[34px] w-10 cursor-pointer place-items-center rounded-md hover:bg-stage-os-hover",
        danger && "hover:bg-scene-red hover:text-scene-white",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/** Kilit ekranı: saat, tarih, öğrencinin kendi avatarı, ortak hesabın adı ve "Oturum aç" (şifre yok). */
function LockScreen({
  time,
  date,
  avatar,
  owner,
  detail,
  onUnlock,
}: {
  time: string;
  date: string;
  avatar: string;
  owner: string;
  detail: string;
  onUnlock: () => void;
}) {
  const t = getMessages().lab.stage;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-stage-lock-scrim p-4 text-center backdrop-blur-[10px] [animation:fade-in_.3s_ease-out_both]"
      data-testid="stage-lock"
    >
      <div className="font-heading text-[clamp(40px,7vw,72px)] leading-none font-medium tabular-nums" aria-hidden="true">
        {time}
      </div>
      <div className="mb-2 text-stage-os-fg-2 first-letter:uppercase" aria-hidden="true">
        {date}
      </div>
      <span
        aria-hidden="true"
        className="flex size-[84px] items-center justify-center rounded-full border-[3px] border-stage-os-line bg-stage-os-glass text-[46px]"
      >
        {avatar}
      </span>
      <div className="text-lg font-bold">{owner}</div>
      <div className="text-[13px] text-stage-os-fg-2">{detail}</div>
      <button
        ref={first}
        type="button"
        onClick={onUnlock}
        className="mt-2 min-h-[46px] cursor-pointer rounded-xl bg-stage-road px-7 text-[15px] font-bold text-stage-road-ink"
        data-testid="stage-unlock"
      >
        {t.signIn}
      </button>
    </div>
  );
}
