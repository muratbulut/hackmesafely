"use client";

import { ArrowRight, Copy, Minus, Power, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { Stage } from "@/lib/lab/content";
import { LogoA } from "@/lib/brand";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Taskbar, WindowBar } from "@/components/device/Computer";
import { AppIcon, OwnerAvatar, StageWall, useClock, useOwner, type StageApp } from "./common";

type WinId = "main" | "browser" | "extra";

/** Masaüstündeki ikinci uygulama (takip görevinde kargo firmasının uygulaması): kendi penceresinde. */
export type ExtraApp = { app: StageApp; title: string; node: ReactNode };
type Win = {
  open: boolean;
  min: boolean;
  max: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

/** Pencerelerin ilk yeri, masaüstünün yüzdesi olarak: uygulama geniş, tarayıcı biraz kaymış. */
const firstRect: Record<WinId, Pick<Win, "x" | "y" | "w" | "h">> = {
  main: { x: 3, y: 3, w: 86, h: 88 },
  browser: { x: 9, y: 6, w: 86, h: 86 },
  extra: { x: 48, y: 4, w: 49, h: 88 },
};

/**
 * Bu genişlikten dar masaüstünde pencereler hep tam boy açılır (telefon). T2'deki masa monitörü
 * dizüstü ekranında da bundan geniştir: orada da pencere taşınır, kenarından büyür, tam boy olur
 * (okul bilgisayarı gibi; Murat 20 Kasım).
 */
const NARROW_PX = 440;
/** Bundan dar masaüstünde pencereler ilk açılışta tam boy açılır (sonra küçültülebilir). */
const ROOMY_PX = 900;
const MIN_W = 24;
const MIN_H = 26;

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

export type DesktopProps = {
  owner: string;
  password?: Stage["password"];
  /** Odanın uygulaması (Postam): oturum açılınca kendi penceresinde açılır. */
  app: StageApp;
  appNode: ReactNode;
  /** Bağlantıdan açılan sayfa; açılınca tarayıcı penceresi öne gelir. */
  browserNode: ReactNode | null;
  onCloseBrowser: () => void;
  /** Yarım kalan denemeye dönülünce oturum açık başlar. */
  startUnlocked?: boolean;
  /** Odanın ikinci uygulaması (isteğe bağlı): simgesi, görev çubuğu düğmesi ve penceresi olur. */
  extra?: ExtraApp | null;
  className?: string;
};

/**
 * M1 masaüstü (oda sahne şablonu, 18 Kasım, Murat): gri duvar ve sarı ağ, solda uygulama
 * simgeleri, altta görev çubuğu (başlat düğmesi gözlü a, açık uygulamalar, gerçek saat), başlat
 * menüsünde "Oturumu kapat" (küçük sürpriz: kilit ekranına döner). Temel eğitimin odalarında
 * kilit ekranında yalnızca "Oturum aç" var; ileri eğitimde şifre sorulur, yazılan şifre hiçbir
 * yere gönderilmez. Uygulamalar ayrı pencerelerdir: taşınır, kenarından büyür, küçülür, tam boy olur, kapanır.
 */
export function Desktop({ owner, password, app, appNode, browserNode, onCloseBrowser, startUnlocked = false, extra = null, className }: DesktopProps) {
  const t = getMessages().lab.stage;
  const name = useOwner(owner);
  const clock = useClock();
  const layer = useRef<HTMLDivElement>(null);
  const sized = useRef(false);
  const [narrow, setNarrow] = useState(false);
  const [unlocked, setUnlocked] = useState(startUnlocked);
  const [menu, setMenu] = useState(false);
  const [focus, setFocus] = useState<WinId | null>(startUnlocked ? "main" : null);
  const zTop = useRef(2);
  const [wins, setWins] = useState<Record<WinId, Win>>(() => ({
    main: {
      ...firstRect.main,
      open: startUnlocked,
      min: false,
      max: false,
      z: 1,
    },
    browser: {
      ...firstRect.browser,
      open: false,
      min: false,
      max: false,
      z: 0,
    },
    extra: {
      ...firstRect.extra,
      open: false,
      min: false,
      max: false,
      z: 0,
    },
  }));

  const appTitle = (id: WinId) =>
    id === "main" ? appName(app) : id === "extra" ? (extra?.title ?? "") : browserNode ? t.browser : `${t.newTab} · ${t.browser}`;
  const appOf = (id: WinId): StageApp => (id === "main" ? app : id === "extra" ? (extra?.app ?? app) : "browser");
  const nameOf = (id: WinId) => (id === "main" ? appName(app) : id === "extra" ? (extra?.title ?? "") : t.browser);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setNarrow(width < NARROW_PX);
      // Küçük masa monitöründe (T2, dizüstü ekranı) pencereler ilk açılışta tam boy gelir: Postam'ın
      // sütunları sıkışmasın. Büyüt / geri al ve kenardan boyutlandırma yine çalışır.
      if (!sized.current && width > 0) {
        sized.current = true;
        if (width < ROOMY_PX) setWins((all) => ({ main: { ...all.main, max: true }, browser: { ...all.browser, max: true }, extra: { ...all.extra, max: true } }));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function raise(id: WinId, patch: Partial<Win> = {}) {
    setWins((all) => ({
      ...all,
      [id]: { ...all[id], ...patch, z: ++zTop.current },
    }));
    setFocus(id);
  }

  /** Kapanan ya da küçülen pencereden sonra öne gelecek: açık pencerelerden en üstteki. */
  function topOpen(all: Record<WinId, Win>, except: WinId) {
    const open = (Object.keys(all) as WinId[]).filter((id) => id !== except && all[id].open && !all[id].min);
    return open.sort((a, b) => all[b].z - all[a].z)[0] ?? null;
  }

  // Bağlantı bir sayfa açınca tarayıcı penceresi öne gelir.
  const hadPage = useRef(!!browserNode);
  useEffect(() => {
    if (browserNode && !hadPage.current) raise("browser", { open: true, min: false });
    // Sayfa kendi "Kapat"ıyla kapanınca pencere de kapanır, uygulama öne gelir.
    if (!browserNode && hadPage.current) {
      setWins((all) => ({
        ...all,
        browser: {
          ...all.browser,
          open: false,
          min: false,
          ...firstRect.browser,
        },
      }));
      setFocus("main");
    }
    hadPage.current = !!browserNode;
  }, [browserNode]);

  function openWin(id: WinId) {
    setMenu(false);
    raise(id, { open: true, min: false });
  }

  function closeWin(id: WinId) {
    setWins((all) => {
      const next = {
        ...all,
        [id]: { ...all[id], open: false, min: false, ...firstRect[id] },
      };
      setFocus(topOpen(next, id));
      return next;
    });
    if (id === "browser" && browserNode) onCloseBrowser();
  }

  function minimize(id: WinId) {
    setWins((all) => {
      const next = { ...all, [id]: { ...all[id], min: true } };
      setFocus(topOpen(next, id));
      return next;
    });
  }

  function taskbarClick(id: WinId) {
    const w = wins[id];
    if (w.open && !w.min && focus === id) minimize(id);
    else openWin(id);
  }

  function unlock() {
    setUnlocked(true);
    raise("main", { open: true, min: false });
  }

  function signOut() {
    setMenu(false);
    setUnlocked(false);
    setFocus(null);
    setWins((all) => ({
      main: { ...all.main, open: false, min: false },
      browser: { ...all.browser, open: false, min: false },
      extra: { ...all.extra, open: false, min: false },
    }));
    if (browserNode) onCloseBrowser();
  }

  // Başlıktan sürükleme ve kenardan büyütme (geniş masaüstünde, tam boy değilken; okul bilgisayarıyla aynı).
  function drag(id: WinId, e: ReactPointerEvent<HTMLElement>, dir: Dir | null = null) {
    if ((!dir && (e.target as HTMLElement).closest("button")) || narrow || wins[id].max || !layer.current) return;
    e.preventDefault();
    const box = layer.current.getBoundingClientRect();
    const r0 = { x: wins[id].x, y: wins[id].y, w: wins[id].w, h: wins[id].h };
    const sx = e.clientX;
    const sy = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    if (focus !== id) raise(id);
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
      setWins((all) => ({ ...all, [id]: { ...all[id], ...r } }));
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

  const ids: WinId[] = extra ? ["main", "browser", "extra"] : ["main", "browser"];

  return (
    <div
      className={cn("st-desktop relative flex min-h-0 flex-1 flex-col overflow-hidden text-stage-os-fg", className)}
      aria-label={format(t.desktop, { owner: name })}
      role="region"
      data-testid="stage-desktop"
      onPointerDown={(e) => {
        if (menu && !(e.target as HTMLElement).closest("[data-start]")) setMenu(false);
      }}
    >
      <StageWall pattern={narrow ? "mobile" : "hero"} />

      {/* Masaüstü simgeleri */}
      <nav aria-label={t.desktopIcons} className="absolute top-3 left-3 z-[1] flex flex-col gap-1.5 max-lg:hidden">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => openWin(id)}
            className="flex w-[86px] cursor-pointer flex-col items-center gap-1.5 rounded-[10px] px-1 py-2 text-[12.5px] [text-shadow:0_1px_3px_var(--stage-shadow)] hover:bg-stage-os-hover"
          >
            <AppIcon app={appOf(id)} className="size-[46px]" />
            <span>{nameOf(id)}</span>
          </button>
        ))}
      </nav>

      {/* Pencereler */}
      <div ref={layer} className="pointer-events-none absolute inset-x-0 top-0 bottom-[46px] z-[2]">
        {ids.map((id) => {
          const w = wins[id];
          const max = w.max || narrow;
          const active = focus === id;
          return (
            <section
              key={id}
              hidden={!w.open || w.min}
              aria-label={appTitle(id)}
              data-testid={id === "main" ? "stage-window-app" : id === "extra" ? "stage-window-extra" : "stage-window-browser"}
              onPointerDownCapture={() => focus !== id && raise(id)}
              className={cn(
                "pointer-events-auto absolute flex flex-col overflow-hidden bg-scene-white text-scene-ink",
                max ? "rounded-none" : "rounded-[10px] border border-stage-os-line",
                active ? "shadow-[0_18px_50px_var(--stage-os-shadow)]" : "shadow-[0_10px_30px_var(--stage-shadow-soft)]",
              )}
              style={
                max
                  ? { inset: 0, zIndex: w.z }
                  : {
                      left: `${w.x}%`,
                      top: `${w.y}%`,
                      width: `${w.w}%`,
                      height: `${w.h}%`,
                      zIndex: w.z,
                    }
              }
            >
              {max
                ? null
                : resizeDirs.map((dir) => (
                    <span key={dir} aria-hidden="true" onPointerDown={(e) => drag(id, e, dir)} className={cn("absolute z-[3] touch-none", dirClass[dir])} />
                  ))}
              <WindowBar
                app={appOf(id)}
                title={appTitle(id)}
                active={active}
                onPointerDown={(e) => drag(id, e)}
                onDoubleClick={(e) =>
                  !(e.target as HTMLElement).closest("button") &&
                  !narrow &&
                  setWins((all) => ({
                    ...all,
                    [id]: { ...all[id], max: !all[id].max },
                  }))
                }
                className={cn("touch-none", !max && "cursor-grab")}
              >
                <span className="flex">
                  <WinButton label={t.window.min} onClick={() => minimize(id)}>
                    <Minus className="size-4" strokeWidth={2} />
                  </WinButton>
                  {!narrow ? (
                    <WinButton
                      label={max ? t.window.restore : t.window.max}
                      onClick={() =>
                        setWins((all) => ({
                          ...all,
                          [id]: { ...all[id], max: !all[id].max },
                        }))
                      }
                    >
                      {max ? <Copy className="size-3.5" strokeWidth={2} /> : <Square className="size-3.5" strokeWidth={2} />}
                    </WinButton>
                  ) : null}
                  <WinButton label={t.window.close} onClick={() => closeWin(id)} danger>
                    <X className="size-4" strokeWidth={2} />
                  </WinButton>
                </span>
              </WindowBar>
              <div inert={!w.open || w.min} className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-scene-white">
                {id === "main" ? appNode : id === "extra" ? extra?.node : (browserNode ?? <NewTab />)}
              </div>
            </section>
          );
        })}
      </div>

      {/* Başlat menüsü */}
      {menu ? (
        <div
          data-start
          className="absolute bottom-[54px] left-2 z-[8] flex w-[min(300px,calc(100%-16px))] flex-col gap-1.5 rounded-[14px] border border-stage-os-line bg-stage-os-glass p-3 shadow-[0_18px_50px_var(--stage-os-shadow)] backdrop-blur-[16px] [animation:fade-up_.2s_ease-out_both]"
          data-testid="stage-start-menu"
        >
          <div className="flex items-center gap-2.5 border-b border-stage-os-line px-1 pt-1 pb-2.5">
            <OwnerAvatar name={name} className="size-9 border-2 text-base" />
            <b>{name}</b>
          </div>
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => openWin(id)}
              className="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[9px] px-2 text-left text-sm hover:bg-stage-os-hover"
            >
              <AppIcon app={appOf(id)} className="size-[26px]" />
              {nameOf(id)}
            </button>
          ))}
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-[42px] cursor-pointer items-center gap-2.5 border-t border-stage-os-line px-2 pt-1.5 text-sm hover:underline"
          >
            <Power className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            {t.signOut}
          </button>
        </div>
      ) : null}

      {/* Görev çubuğu */}
      <Taskbar
        className="absolute inset-x-0 bottom-0"
        start={
          <button
            type="button"
            data-start
            aria-label={t.start}
            aria-expanded={menu}
            disabled={!unlocked}
            onClick={() => setMenu((m) => !m)}
            className="dv-pc-start cursor-pointer hover:bg-stage-os-hover aria-expanded:bg-stage-os-hover"
          >
            <LogoA />
          </button>
        }
      >
        <div role="group" aria-label={t.openApps}>
          {ids.map((id) => {
            const w = wins[id];
            const isActive = focus === id && w.open && !w.min;
            return (
              <button
                key={id}
                type="button"
                disabled={!unlocked}
                aria-pressed={isActive}
                // Telefon genişliğinde ad gizli; düğmenin adı yine okunur.
                aria-label={nameOf(id)}
                data-open={w.open}
                data-active={isActive}
                onClick={() => taskbarClick(id)}
                className="dv-pc-task cursor-pointer hover:bg-stage-os-hover"
              >
                <AppIcon app={appOf(id)} className="dv-pc-icon" />
                <span className="max-sm:hidden">{nameOf(id)}</span>
              </button>
            );
          })}
        </div>
      </Taskbar>

      {unlocked ? null : <LockScreen name={name} password={password} onUnlock={unlock} time={clock.time} date={clock.dateLong} />}
    </div>
  );
}

function appName(app: StageApp) {
  const m = getMessages().lab;
  return app === "postam" ? m.inbox.app : app === "messages" ? m.messaging.app : m.stage.browser;
}

function WinButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
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
    >
      {children}
    </button>
  );
}

/** Tarayıcı bağlantısız açılınca: boş sekme. Hiçbir adres yazılmaz, hiçbir site açılmaz. */
function NewTab() {
  const t = getMessages().lab.stage;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-scene-paper p-6 text-center text-scene-ink-muted">
      <AppIcon app="browser" className="size-14" />
      <b className="text-scene-ink">{t.newTab}</b>
      <p className="max-w-[36ch] text-sm">{t.newTabText}</p>
    </div>
  );
}

/**
 * Kilit ekranı: saat, tarih, sahibin adı. Şifresiz odada "Oturum aç"; şifreli odada şifre kutusu
 * ve ipucu mesajı (dokununca şifre kutuya yazılır). Şifre yalnızca burada karşılaştırılır.
 */
function LockScreen({
  name,
  password,
  onUnlock,
  time,
  date,
}: {
  name: string;
  password?: Stage["password"];
  onUnlock: () => void;
  time: string;
  date: string;
}) {
  const t = getMessages().lab.stage;
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (password ? input : first).current?.focus({ preventScroll: true });
  }, [password]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || value.trim() === password.value.trim()) return onUnlock();
    setWrong(true);
    setValue("");
  }

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-stage-lock-scrim p-6 text-center backdrop-blur-[8px] [animation:fade-in_.3s_ease-out_both]"
      data-testid="stage-lock"
    >
      <div className="font-heading text-[clamp(40px,7vw,72px)] leading-none font-medium tabular-nums" aria-hidden="true">
        {time}
      </div>
      <div className="mb-2 text-stage-os-fg-2 first-letter:uppercase" aria-hidden="true">
        {date}
      </div>
      <OwnerAvatar name={name} className="size-[72px] text-3xl" />
      <div className="text-lg font-bold">{name}</div>
      {password ? (
        <>
          <form onSubmit={submit} autoComplete="off" className={cn("flex items-center gap-1.5", wrong && "[animation:call-buzz_.5s_1]")}>
            <input
              ref={input}
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setWrong(false);
              }}
              autoComplete="off"
              placeholder={t.password}
              aria-label={t.password}
              aria-invalid={wrong || undefined}
              className="h-11 w-[220px] rounded-[10px] border border-stage-os-line bg-stage-os-glass px-3 text-stage-os-fg placeholder:text-stage-os-muted"
            />
            <button
              type="submit"
              aria-label={t.enter}
              className="grid size-11 cursor-pointer place-items-center rounded-[10px] bg-stage-road text-stage-road-ink"
            >
              <ArrowRight className="size-5" strokeWidth={2.4} />
            </button>
          </form>
          <p role="status" className="min-h-5 text-sm text-stage-error">
            {wrong ? t.wrong : ""}
          </p>
          {password.hint.trim() ? (
            <button
              type="button"
              onClick={() => {
                setValue(password.value);
                setWrong(false);
                input.current?.focus();
              }}
              className="flex max-w-[340px] cursor-pointer items-start gap-2.5 rounded-[14px] border border-stage-os-line bg-stage-os-glass p-3 text-left text-sm"
            >
              <OwnerAvatar name={password.hintFrom || name} className="size-8 border-2 text-sm" />
              <span>
                {password.hintFrom ? <small className="block text-xs text-stage-os-muted">{password.hintFrom}</small> : null}
                {password.hint}
              </span>
            </button>
          ) : null}
        </>
      ) : (
        <button
          ref={first}
          type="button"
          onClick={onUnlock}
          className="mt-1.5 min-h-[46px] cursor-pointer rounded-xl bg-stage-road px-7 text-[15px] font-bold text-stage-road-ink"
        >
          {t.signIn}
        </button>
      )}
    </div>
  );
}
