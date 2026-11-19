"use client";

import {
  AlarmClock,
  ArrowLeft,
  BatteryFull,
  Bell,
  Calculator,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Flashlight,
  House,
  Images,
  LayoutGrid,
  LoaderCircle,
  Lock,
  MapPin,
  Music,
  NotebookPen,
  Power,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ClientInstall, ClientSetup, ClientStoreApp } from "@/lib/lab/client";
import type { SceneState } from "@/lib/lab/events";
import type { WifiResult } from "@/lib/lab/setup";
import type { InstallPrompt } from "@/lib/lab/story";
import { format, getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { cardIconMap } from "../training/card-icons";
import { AppIcon, useClock } from "../stage/common";
import { FileFlow, PermissionPrompt, Store, type InstallHandlers } from "./InstallPhone";

/** Telefon kurulumunun eylemleri; her biri sürücüye gider, sonuç gelmezse null (ya da false). */
export type SetupHandlers = InstallHandlers & {
  connectWifi: (network: number, password: boolean) => Promise<WifiResult | null>;
  installUpdate: () => Promise<string | null>;
  closeAd: (itemId: string) => Promise<boolean>;
  finishSetup: () => Promise<boolean>;
};

type Props = {
  install: ClientInstall;
  setup: ClientSetup;
  /** Görevi veren (bitiş bildirimi ondan gelir): "Ayça". */
  caller: string;
  state: SceneState;
  /** Reklamın indirdiği dosya (öğenin eki). */
  files: Record<string, { name: string; size: string }>;
  handlers: SetupHandlers;
};

type Screen = { app: "home" } | { app: "settings"; page: "list" | "update" | "battery" } | { app: "store"; open: string | null } | { app: "run"; id: string };
type FileStep = "download" | "blocked" | "settings" | "confirm";
type Prompting = { appId: string; prompts: InstallPrompt[]; index: number };

const tileColors = ["bg-scene-green", "bg-scene-ink-2", "bg-scene-blue"];

/**
 * Telefon kurulumu (T1, Şehir Kapısı "Yeni telefonunu kur"): sıfırlanmış telefon kurulum ekranıyla
 * açılır. Wi‑Fi listesinde evin ağı (şifresi defterde), açık ağ (bağlanınca not) ve komşunun ağı
 * (şifresi bilinmez) durur. Ana ekranda bildirim çubuğu, Ayarlar (güncelleme, pil) ve Mağaza; kurulan
 * uygulamalar (Harita, El Feneri) açılır. El Feneri'nde tam ekran reklam "virüs" diye korkutur:
 * × kapatır, TEMİZLE dosyayı indirir ve telefonun uyarıları gelir (InstallPhone'daki FileFlow). Her
 * şey kurulunca arayanın bildirimine "Kurdum!" denir. Hangi ağın evin ağı olduğu ve doğru izinler
 * tarayıcıda bilinmez; sonuçları sunucu söyler.
 */
export function SetupPhone({ install, setup, caller, state, files, handlers }: Props) {
  const t = getMessages().lab.setup;
  const adItem = setup.ad.item;
  // Evin ağı kilitlidir ve kilitli bir ağa yalnızca şifresi bilinen evin ağında bağlanılır.
  const joinedFromState = (state.wifi ?? []).some((i) => setup.networks[i]?.locked);
  const [phase, setPhase] = useState<"welcome" | "wifi" | "ready">(joinedFromState ? "ready" : (state.wifi ?? []).length > 0 ? "wifi" : "welcome");
  const [screen, setScreen] = useState<Screen>({ app: "home" });
  const [shade, setShade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [prompting, setPrompting] = useState<Prompting | null>(null);
  const [file, setFile] = useState<FileStep | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateDone, setUpdateDone] = useState<string | null>(null);
  const [banner, setBanner] = useState<"update" | null>(null);

  const installed = state.installed ?? [];
  const updated = !!state.updated;
  const adDone = (state.adsClosed ?? []).includes(adItem) || (state.filesOpened ?? []).includes(adItem) || state.infoEntered.includes(adItem);
  const allInstalled = install.apps.every((a) => installed.includes(a.id));
  const ready = phase === "ready" && updated && allInstalled && !prompting && !adOpen && !file && !installing;
  const finished = !!state.setupFinished;

  async function step<T>(next: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true);
    try {
      return await next();
    } finally {
      setBusy(false);
    }
  }

  // Ana ekrana gelince güncelleme bildirimi düşer (yüklenmediyse).
  useEffect(() => {
    if (phase !== "ready" || updated) return;
    const timer = window.setTimeout(() => setBanner("update"), 1800);
    return () => window.clearTimeout(timer);
  }, [phase, updated]);

  // El Feneri açılınca birkaç saniye sonra tam ekran reklam (bir kez; kapatılınca ya da TEMİZLE'den sonra gelmez).
  const runningAd = screen.app === "run" && screen.id === setup.ad.app && !adDone && !prompting;
  useEffect(() => {
    if (!runningAd) return;
    const timer = window.setTimeout(() => setAdOpen(true), 1600);
    return () => window.clearTimeout(timer);
  }, [runningAd]);

  async function get(app: ClientStoreApp) {
    if (installing) return;
    setInstalling(app.id);
    const wait = new Promise((resolve) => window.setTimeout(resolve, 900));
    const [result] = await Promise.all([handlers.installApp(app.id), wait]);
    setInstalling(null);
    if (!result) return;
    if (result.prompts.length > 0) setPrompting({ appId: app.id, prompts: result.prompts, index: 0 });
    else setScreen({ app: "run", id: app.id });
  }

  async function choose(choice: number) {
    if (!prompting) return;
    const { appId, prompts, index } = prompting;
    await step(async () => {
      const result = await handlers.answerPermission(appId, index, choice);
      if (!result) return;
      if (index + 1 < prompts.length) setPrompting({ appId, prompts, index: index + 1 });
      else {
        setPrompting(null);
        // Son izinden sonra uygulama açılır.
        setScreen({ app: "run", id: appId });
      }
    });
  }

  async function doUpdate() {
    if (updating) return;
    setUpdating(true);
    const wait = new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion() ? 300 : 1800));
    const [done] = await Promise.all([handlers.installUpdate(), wait]);
    setUpdating(false);
    if (done) {
      setUpdateDone(done);
      setBanner(null);
    }
  }

  async function closeAd() {
    await step(async () => {
      if (await handlers.closeAd(adItem)) setAdOpen(false);
    });
  }

  async function clean() {
    await step(async () => {
      if (await handlers.openFile(adItem)) {
        setAdOpen(false);
        setAllowed(false);
        setFile("blocked");
      }
    });
  }

  async function installFile() {
    await step(async () => {
      await handlers.installFile(adItem);
      setFile(null);
    });
  }

  const appById = (id: string) => install.apps.find((a) => a.id === id) ?? null;
  const adApp = appById(setup.ad.app);
  const fileInfo = files[adItem] ?? null;

  if (phase !== "ready") {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-scene-white font-sans text-scene-ink" data-testid="setup-phone">
        {phase === "welcome" ? (
          <Welcome onStart={() => setPhase("wifi")} />
        ) : (
          <WifiSetup setup={setup} connected={state.wifi ?? []} onConnect={handlers.connectWifi} onJoined={() => setPhase("ready")} />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-scene-white font-sans text-scene-ink" data-testid="setup-phone">
      <ShadeHandle onOpen={() => setShade(true)} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {screen.app === "home" ? (
          <Home
            install={install}
            installed={installed}
            onSettings={() => setScreen({ app: "settings", page: "list" })}
            onStore={() => setScreen({ app: "store", open: null })}
            onRun={(id) => setScreen({ app: "run", id })}
          />
        ) : null}
        {screen.app === "settings" ? (
          <SettingsApp
            setup={setup}
            page={screen.page}
            updated={updated}
            updating={updating}
            updateDone={updateDone}
            onPage={(page) => setScreen({ app: "settings", page })}
            onUpdate={doUpdate}
          />
        ) : null}
        {screen.app === "store" ? (
          <Store
            install={install}
            queries={install.apps.map((a) => a.name)}
            open={screen.open}
            installed={installed}
            removed={[]}
            installing={installing}
            onOpenApp={(id) => setScreen({ app: "store", open: id })}
            onBack={() => setScreen({ app: "store", open: null })}
            onGet={get}
            onLaunch={(id) => setScreen({ app: "run", id })}
          />
        ) : null}
        {screen.app === "run" ? <RunApp app={appById(screen.id)} index={install.apps.findIndex((a) => a.id === screen.id)} isAdApp={screen.id === setup.ad.app} /> : null}
      </div>

      {screen.app !== "home" ? (
        <nav aria-label={t.home.label} className="flex h-12 flex-none items-center justify-center border-t border-scene-line bg-scene-paper">
          <button
            type="button"
            onClick={() => setScreen({ app: "home" })}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-[13px] font-bold text-scene-ink-2"
            data-testid="setup-home"
          >
            <House className="size-4" strokeWidth={2.2} aria-hidden="true" />
            {t.home.back}
          </button>
        </nav>
      ) : null}

      {banner === "update" && !shade && !updated && !adOpen && !prompting ? (
        <HeadsUp
          icon={<AppIcon app="settings" className="size-8" />}
          from={t.shade.system}
          title={setup.update.title}
          text={setup.update.text}
          onOpen={() => {
            setBanner(null);
            setScreen({ app: "settings", page: "update" });
          }}
          testId="update-banner"
        />
      ) : null}

      {/* Ayça'nın sorusu ana ekranda gelir: açık uygulamanın ve reklamın üstüne binmez. */}
      {ready && !finished && !shade && screen.app === "home" && !adOpen && !file && !prompting ? <FinishBanner caller={caller} finish={setup.finish} busy={busy} onReply={() => step(handlers.finishSetup)} /> : null}
      {finished ? <SentBanner caller={caller} reply={setup.finish.reply} /> : null}

      {shade ? (
        <Shade
          setup={setup}
          updated={updated}
          onClose={() => setShade(false)}
          onUpdate={() => {
            setShade(false);
            setBanner(null);
            setScreen({ app: "settings", page: "update" });
          }}
        />
      ) : null}

      {adOpen ? <FullScreenAd ad={setup.ad} busy={busy} onClose={closeAd} onClean={clean} /> : null}

      {file && fileInfo ? (
        <FileFlow
          name={fileInfo.name}
          size={fileInfo.size}
          step={file}
          allowed={allowed}
          busy={busy}
          source={adApp ? { name: adApp.name, icon: <AppGlyph app={adApp} index={install.apps.indexOf(adApp)} className="size-10" /> } : undefined}
          onCancel={() => setFile(null)}
          onDownload={() => setFile("blocked")}
          onSettings={() => setFile("settings")}
          onToggle={() => setAllowed((a) => !a)}
          onContinue={() => setFile("confirm")}
          onInstall={installFile}
        />
      ) : null}

      {prompting ? (
        <PermissionPrompt
          key={`${prompting.appId}-${prompting.index}`}
          app={appById(prompting.appId)?.name ?? ""}
          prompt={prompting.prompts[prompting.index]}
          busy={busy}
          onChoose={choose}
        />
      ) : null}
    </div>
  );
}

/** Kurulumun ilk ekranı: "Merhaba" ve "Başla". */
function Welcome({ onStart }: { onStart: () => void }) {
  const t = getMessages().lab.setup.welcome;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[radial-gradient(120%_70%_at_50%_10%,color-mix(in_srgb,var(--scene-blue)_20%,var(--scene-white)),var(--scene-white))] px-8 text-center" data-testid="setup-welcome">
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-scene-blue/15 text-scene-blue">
        <Power className="size-8" strokeWidth={2} />
      </span>
      <h2 className="font-heading text-[34px] leading-none font-medium">{t.title}</h2>
      <p className="text-[15px] leading-snug text-scene-ink-2">{t.text}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-scene-blue px-10 text-[16px] font-bold text-scene-white"
        data-testid="setup-start"
      >
        {t.start}
        <ChevronRight className="size-5" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Kurulumun Wi‑Fi ekranı: ağ listesi, kilitli ağda şifre kutusu (deftere bakınca dolar, yazılan
 * gitmez), açık ağda not, bilinmeyen şifrede uyarı. Evin ağına bağlanınca ana ekrana geçilir.
 */
function WifiSetup({
  setup,
  connected,
  onConnect,
  onJoined,
}: {
  setup: ClientSetup;
  connected: number[];
  onConnect: (network: number, password: boolean) => Promise<WifiResult | null>;
  onJoined: () => void;
}) {
  const t = getMessages().lab.setup;
  const [asking, setAsking] = useState<number | null>(null);
  const [filled, setFilled] = useState(false);
  const [notebook, setNotebook] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<{ title: string; text: string; button: string } | null>(null);
  const [joined, setJoined] = useState<number | null>(null);
  const inputId = useId();
  const titleId = useId();

  async function connect(index: number, password: boolean) {
    if (busy !== null) return;
    setBusy(index);
    const wait = new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion() ? 150 : 700));
    const [result] = await Promise.all([onConnect(index, password), wait]);
    setBusy(null);
    if (!result) return;
    setAsking(null);
    setNotebook(false);
    setFilled(false);
    if (result.status === "joined") {
      setJoined(index);
      window.setTimeout(onJoined, prefersReducedMotion() ? 300 : 1100);
    } else if (result.status === "open") {
      setNote(result.note);
    } else {
      setNote({ title: t.unknownTitle, text: result.text, button: t.ok });
    }
  }

  function tap(index: number) {
    const net = setup.networks[index];
    if (!net || joined !== null) return;
    if (net.locked) {
      setAsking(index);
      setFilled(false);
      setNotebook(false);
    } else void connect(index, false);
  }

  const askingNet = asking !== null ? setup.networks[asking] : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" data-testid="setup-wifi">
      <div className="flex flex-none flex-col gap-1 px-5 pt-7 pb-4">
        <span aria-hidden="true" className="mb-2 flex size-11 items-center justify-center rounded-full bg-scene-blue/15 text-scene-blue">
          <Wifi className="size-6" strokeWidth={2.2} />
        </span>
        <h2 className="font-heading text-[24px] leading-tight font-medium">{t.wifi.title}</h2>
        <p className="text-[14px] text-scene-ink-2">{t.wifi.text}</p>
      </div>
      <ul className="flex flex-col border-y border-scene-line">
        {setup.networks.map((net, i) => (
          <li key={net.name}>
            <button
              type="button"
              onClick={() => tap(i)}
              disabled={busy !== null || joined !== null}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-scene-line-soft px-5 py-2.5 text-left last:border-b-0 disabled:cursor-default"
              data-testid="wifi-network"
            >
              <Wifi className="size-5 flex-none text-scene-ink-2" strokeWidth={2.2} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate font-mono text-[14.5px]">{net.name}</b>
                <span className="text-[12px] text-scene-ink-muted">
                  {joined === i ? t.wifi.connected : busy === i ? t.wifi.connecting : net.locked ? t.wifi.locked : t.wifi.open}
                </span>
              </span>
              {busy === i ? (
                <LoaderCircle className="size-4 flex-none text-scene-blue motion-safe:animate-spin" strokeWidth={2.4} aria-hidden="true" />
              ) : joined === i ? (
                <Check className="size-5 flex-none text-scene-green" strokeWidth={2.6} aria-hidden="true" />
              ) : net.locked ? (
                <Lock className="size-4 flex-none text-scene-ink-muted" strokeWidth={2.2} aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="px-5 pt-3 text-[12px] text-scene-ink-muted">{t.wifi.noSim}</p>
      {joined !== null ? (
        <p role="status" className="mx-5 mt-auto mb-5 flex items-center gap-2 rounded-xl bg-scene-school-soft px-4 py-3 text-[14px] font-bold text-scene-school-ink" data-testid="wifi-joined">
          <Check className="size-5" strokeWidth={2.6} aria-hidden="true" />
          {format(t.wifi.joined, { name: setup.networks[joined]?.name ?? "" })}
        </p>
      ) : null}
      {/* Önceki bağlantılar yalnızca sayılır; liste hep aynı kalır (açık ağ "unutulmuş" olur). */}
      <span hidden data-connected={connected.join(",")} />

      {askingNet && asking !== null ? (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-scene-scrim/60 p-3 [animation:fade-in_.15s_ease-out_both]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-[340px] rounded-[24px] bg-scene-white px-5 pt-5 pb-3 shadow-floating motion-safe:[animation:perm-pop_.3s_ease-out_both]"
            data-testid="wifi-password"
          >
            <h3 id={titleId} className="font-mono text-[16px] font-bold">
              {format(t.wifi.passwordTitle, { name: askingNet.name })}
            </h3>
            <label htmlFor={inputId} className="sr-only">
              {t.wifi.password}
            </label>
            <input
              id={inputId}
              readOnly
              type="password"
              value={filled ? setup.password : ""}
              placeholder={t.wifi.password}
              onClick={() => setNotebook(true)}
              className="mt-3 h-11 w-full rounded-xl border border-scene-line-strong bg-scene-paper px-3 font-mono text-[15px] tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-scene-ink-faint focus-visible:ring-2 focus-visible:ring-scene-blue"
              data-testid="wifi-password-input"
            />
            {notebook ? (
              <div className="mt-3 rotate-[-1.5deg] rounded-[4px_14px_14px_4px] border-l-[6px] border-scene-amber bg-scene-note px-4 py-3 text-scene-note-ink shadow-[0_6px_14px_var(--scene-shadow)]" data-testid="wifi-notebook">
                <span className="block text-[12px] font-bold text-scene-note-muted">{setup.notebook.title}</span>
                <span className="block font-mono text-[20px] font-bold tracking-wide">{setup.password}</span>
                {setup.notebook.from ? <span className="block text-right text-[12px] text-scene-note-muted">{setup.notebook.from}</span> : null}
                {!filled ? (
                  <button
                    type="button"
                    onClick={() => setFilled(true)}
                    className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-scene-note-chip text-[14px] font-bold text-scene-note-ink"
                    data-testid="wifi-fill"
                  >
                    {t.wifi.fill}
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNotebook(true)}
                className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-scene-line-strong text-[14px] font-bold text-scene-ink-2"
                data-testid="wifi-notebook-open"
              >
                <NotebookPen className="size-4" strokeWidth={2.2} aria-hidden="true" />
                {t.wifi.notebook}
              </button>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(null)} className="h-10 cursor-pointer rounded-full px-4 text-[14px] font-bold text-scene-blue">
                {t.wifi.cancel}
              </button>
              <button
                type="button"
                onClick={() => connect(asking, true)}
                disabled={!filled || busy !== null}
                className="h-10 cursor-pointer rounded-full bg-scene-blue px-5 text-[14px] font-bold text-scene-white disabled:cursor-default disabled:opacity-40"
                data-testid="wifi-connect"
              >
                {t.wifi.connect}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {note ? (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-scene-scrim/60 p-3 [animation:fade-in_.15s_ease-out_both]">
          <div role="alertdialog" aria-modal="true" aria-label={note.title} className="w-full max-w-[340px] rounded-[24px] bg-scene-amber-soft px-5 pt-5 pb-4 text-scene-amber-ink shadow-floating motion-safe:[animation:perm-pop_.3s_ease-out_both]" data-testid="wifi-note">
            <b className="block font-heading text-[19px]">{note.title}</b>
            <p className="mt-1.5 text-[14px] leading-snug">{note.text}</p>
            <button
              type="button"
              onClick={() => setNote(null)}
              className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-scene-amber text-[15px] font-bold text-scene-ink"
              data-testid="wifi-note-ok"
            >
              {note.button}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Ekranın üstündeki ince şerit: dokununca ya da aşağı çekince bildirim çubuğu açılır. */
function ShadeHandle({ onOpen }: { onOpen: () => void }) {
  const t = getMessages().lab.setup.shade;
  const start = useRef<number | null>(null);
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerDown={(e) => {
        start.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (start.current !== null && e.clientY - start.current > 24) {
          start.current = null;
          onOpen();
        }
      }}
      onPointerUp={() => {
        start.current = null;
      }}
      aria-label={t.open}
      className="relative z-20 flex h-10 flex-none cursor-pointer touch-none items-center justify-center bg-scene-paper"
      data-testid="shade-handle"
    >
      <span aria-hidden="true" className="flex items-center gap-1 text-[11px] font-bold text-scene-ink-muted">
        <Bell className="size-3.5" strokeWidth={2.2} />
        <ChevronDown className="size-4" strokeWidth={2.4} />
      </span>
    </button>
  );
}

/** Bildirim çubuğu: hızlı ayarlar (süs) ve telefonun kendi bildirimleri (güncelleme). */
function Shade({ setup, updated, onClose, onUpdate }: { setup: ClientSetup; updated: boolean; onClose: () => void; onUpdate: () => void }) {
  const t = getMessages().lab.setup.shade;
  const tiles: { icon: LucideIcon; label: string; on: boolean }[] = [
    { icon: Wifi, label: t.tiles.wifi, on: true },
    { icon: MapPin, label: t.tiles.location, on: true },
    { icon: Volume2, label: t.tiles.sound, on: true },
    { icon: RotateCw, label: t.tiles.rotate, on: false },
  ];
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-scene-ink/95 text-scene-white motion-safe:[animation:slide-down_.22s_ease-out_both]" data-testid="shade">
      <div aria-hidden="true" className="grid grid-cols-4 gap-2 px-4 pt-5 pb-4">
        {tiles.map((tile) => (
          <span key={tile.label} className="flex flex-col items-center gap-1.5 text-[11px]">
            <span className={cn("flex size-12 items-center justify-center rounded-full", tile.on ? "bg-scene-blue text-scene-white" : "bg-scene-white/15 text-scene-white/80")}>
              <tile.icon className="size-5" strokeWidth={2.2} />
            </span>
            {tile.label}
          </span>
        ))}
      </div>
      <h3 className="px-4 pb-2 text-[12px] font-bold tracking-[0.5px] text-scene-white/70">{t.title.toLocaleUpperCase("tr")}</h3>
      <div className="flex flex-col gap-2 px-3">
        {!updated ? (
          <button
            type="button"
            onClick={onUpdate}
            className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-scene-white px-3.5 py-3 text-left text-scene-ink"
            data-testid="shade-update"
          >
            <AppIcon app="settings" className="size-9" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1.5 text-[11.5px] text-scene-ink-muted">
                {t.system}
                <span aria-hidden="true">·</span>
                {t.now}
              </span>
              <b className="text-[14.5px] leading-snug">{setup.update.title}</b>
              <span className="text-[13px] leading-snug text-scene-ink-2">{setup.update.text}</span>
            </span>
          </button>
        ) : (
          <p className="rounded-2xl bg-scene-white/10 px-4 py-4 text-center text-[13px] text-scene-white/80">{t.empty}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="mt-auto flex h-12 flex-none cursor-pointer items-center justify-center text-scene-white/80"
        data-testid="shade-close"
      >
        <ChevronDown className="size-6 rotate-180" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Ekranın üstüne düşen bildirim (güncelleme). */
function HeadsUp({ icon, from, title, text, onOpen, testId }: { icon: React.ReactNode; from: string; title: string; text: string; onOpen: () => void; testId: string }) {
  return (
    <div className="absolute inset-x-2 top-12 z-20 motion-safe:[animation:slide-down_.25s_ease-out_both]">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-scene-line bg-scene-white px-3.5 py-3 text-left shadow-floating"
        data-testid={testId}
      >
        {icon}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11.5px] text-scene-ink-muted">{from}</span>
          <b className="text-[14px] leading-snug">{title}</b>
          <span className="text-[12.5px] leading-snug text-scene-ink-2">{text}</span>
        </span>
      </button>
    </div>
  );
}

/** Her şey kurulunca arayanın bildirimi; hazır cevapla ("Kurdum!") görev biter. */
function FinishBanner({ caller, finish, busy, onReply }: { caller: string; finish: ClientSetup["finish"]; busy: boolean; onReply: () => void }) {
  return (
    <div className="absolute inset-x-2 top-12 z-20 motion-safe:[animation:slide-down_.25s_ease-out_both]" data-testid="finish-banner">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-scene-line bg-scene-white px-3.5 py-3 shadow-floating">
        <span className="flex items-start gap-3">
          <AppIcon app="messages" className="size-8" />
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-[13.5px]">{caller}</b>
            <span className="text-[14px] leading-snug text-scene-ink-2">{finish.text}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={onReply}
          disabled={busy}
          className="flex h-10 cursor-pointer items-center justify-center gap-2 self-end rounded-full bg-scene-green px-5 text-[14px] font-bold text-scene-white disabled:opacity-60"
          data-testid="finish-reply"
        >
          <Send className="size-4" strokeWidth={2.4} aria-hidden="true" />
          {finish.reply}
        </button>
      </div>
    </div>
  );
}

function SentBanner({ caller, reply }: { caller: string; reply: string }) {
  const t = getMessages().lab.setup.finish;
  return (
    <p role="status" className="absolute inset-x-2 top-12 z-10 flex items-center gap-2 rounded-2xl bg-scene-school-soft px-3.5 py-2.5 text-[13px] text-scene-school-ink" data-testid="finish-sent">
      <Check className="size-4 flex-none" strokeWidth={2.6} aria-hidden="true" />
      <span className="min-w-0 truncate">
        {format(t.sent, { caller, reply })}
      </span>
    </p>
  );
}

const decoIcons: LucideIcon[] = [Camera, Images, AlarmClock, CloudSun, NotebookPen, Calendar, Music, Calculator];

/** Ana ekran: saat, süs simgeler, kurulan uygulamalar; altta Ayarlar ve Mağaza. */
function Home({
  install,
  installed,
  onSettings,
  onStore,
  onRun,
}: {
  install: ClientInstall;
  installed: string[];
  onSettings: () => void;
  onStore: () => void;
  onRun: (id: string) => void;
}) {
  const t = getMessages().lab.setup.home;
  const clock = useClock();
  const apps = install.apps.filter((a) => installed.includes(a.id));
  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_srgb,var(--scene-blue)_22%,var(--scene-paper)),var(--scene-paper))] px-5 pt-4 pb-4" data-testid="setup-home-screen">
      <div aria-hidden="true" className="flex flex-col items-center gap-0.5 pb-5 text-scene-ink">
        <span className="font-heading text-[44px] leading-none font-medium tabular-nums">{clock.time}</span>
        <span className="text-[13px] text-scene-ink-muted first-letter:uppercase">{clock.dateLong}</span>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {t.deco.map((name, i) => {
          const Icon = decoIcons[i % decoIcons.length];
          return (
            <span key={name} aria-hidden="true" className="flex flex-col items-center gap-1.5 text-[11.5px] text-scene-ink-2">
              <span className="flex size-[50px] items-center justify-center rounded-[22%] bg-scene-white text-scene-ink-2 shadow-[0_3px_8px_var(--scene-shadow)]">
                <Icon className="size-[48%]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate">{name}</span>
            </span>
          );
        })}
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => onRun(app.id)}
            className="flex cursor-pointer flex-col items-center gap-1.5 text-[11.5px] font-bold text-scene-ink motion-safe:[animation:pop_.35s_ease-out_both]"
            data-testid={`setup-run-${app.id}`}
          >
            <AppGlyph app={app} index={install.apps.indexOf(app)} className="size-[50px] shadow-[0_3px_8px_var(--scene-shadow)]" />
            <span className="max-w-full truncate">{app.name}</span>
          </button>
        ))}
      </div>
      <ul aria-label={t.label} className="mt-auto flex justify-center gap-8 rounded-[28px] border border-scene-line bg-scene-white/70 px-6 py-3 backdrop-blur">
        <li>
          <button type="button" onClick={onSettings} className="flex cursor-pointer flex-col items-center gap-1.5 text-[12.5px] font-bold text-scene-ink" data-testid="setup-app-settings">
            <AppIcon app="settings" className="size-[58px] shadow-[0_6px_14px_var(--scene-shadow)]" />
            {t.apps.settings}
          </button>
        </li>
        <li>
          <button type="button" onClick={onStore} className="flex cursor-pointer flex-col items-center gap-1.5 text-[12.5px] font-bold text-scene-ink" data-testid="setup-app-store">
            <AppIcon app="store" className="size-[58px] shadow-[0_6px_14px_var(--scene-shadow)]" />
            {install.store || t.apps.store}
          </button>
        </li>
      </ul>
    </div>
  );
}

/** Mağazadaki uygulamanın simgesi (ana ekranda ve izin ayarında). */
function AppGlyph({ app, index, className }: { app: ClientStoreApp; index: number; className?: string }) {
  const Icon = cardIconMap[app.icon];
  return (
    <span aria-hidden="true" className={cn("flex flex-none items-center justify-center rounded-[22%] text-scene-white", tileColors[index % tileColors.length], className)}>
      <Icon className="size-[55%]" strokeWidth={2.1} />
    </span>
  );
}

/** Ayarlar: liste, sistem güncellemesi ve pil sayfası; diğer satırlar süstür (açılmaz). */
function SettingsApp({
  setup,
  page,
  updated,
  updating,
  updateDone,
  onPage,
  onUpdate,
}: {
  setup: ClientSetup;
  page: "list" | "update" | "battery";
  updated: boolean;
  updating: boolean;
  updateDone: string | null;
  onPage: (page: "list" | "update" | "battery") => void;
  onUpdate: () => void;
}) {
  const t = getMessages().lab.setup.settings;
  const home = setup.networks.find((n) => n.locked)?.name ?? "";

  const header = (title: string, back: boolean) => (
    <div className="flex flex-none items-center gap-1 border-b border-scene-line px-2 py-1.5">
      {back ? (
        <button type="button" onClick={() => onPage("list")} aria-label={t.back} className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-scene-ink-2">
          <ArrowLeft className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h2 className="text-[17px] font-bold">{title}</h2>
    </div>
  );

  if (page === "update") {
    const current = updated || updateDone !== null;
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="settings-update">
        {header(t.rows.update, true)}
        <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
          <span aria-hidden="true" className={cn("flex size-16 items-center justify-center rounded-full", current ? "bg-scene-school-soft text-scene-green" : "bg-scene-blue/15 text-scene-blue")}>
            {current ? <ShieldCheck className="size-8" strokeWidth={2} /> : <RefreshCw className={cn("size-8", updating && "motion-safe:animate-spin")} strokeWidth={2} />}
          </span>
          <b className="text-[18px] leading-snug">{current ? t.update.current : setup.update.title}</b>
          {current ? (
            <p role="status" className="text-[14px] leading-snug text-scene-ink-2" data-testid="update-done">
              {updateDone ?? setup.update.version}
            </p>
          ) : (
            <>
              <p className="text-[14px] leading-snug text-scene-ink-2">{setup.update.text}</p>
              <dl className="grid w-full grid-cols-2 divide-x divide-scene-line rounded-xl border border-scene-line">
                <div className="flex flex-col gap-0.5 px-2 py-2">
                  <dt className="text-[11px] text-scene-ink-muted">{t.update.version}</dt>
                  <dd className="text-[13px] font-bold">{setup.update.version}</dd>
                </div>
                <div className="flex flex-col gap-0.5 px-2 py-2">
                  <dt className="text-[11px] text-scene-ink-muted">{t.update.size}</dt>
                  <dd className="text-[13px] font-bold">{setup.update.size}</dd>
                </div>
              </dl>
              {updating ? (
                <span role="status" className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-scene-paper text-sm font-bold text-scene-ink-2">
                  {t.update.installing}
                  <span aria-hidden="true" className="ml-1 h-1.5 w-24 overflow-hidden rounded-full bg-scene-line">
                    <span className="block h-full w-full origin-left rounded-full bg-scene-blue motion-safe:[animation:install-bar_1.8s_ease-out_both]" />
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onUpdate}
                  className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-scene-blue text-[15px] font-bold text-scene-white"
                  data-testid="update-install"
                >
                  {t.update.install}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (page === "battery") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="settings-battery">
        {header(t.battery.title, true)}
        <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
          <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-scene-school-soft text-scene-green">
            <ShieldCheck className="size-8" strokeWidth={2} />
          </span>
          <b className="text-[18px]">{t.battery.status}</b>
          <p className="text-[14px] leading-snug text-scene-ink-2">{t.battery.text}</p>
          <dl className="mt-2 flex w-full flex-col divide-y divide-scene-line rounded-xl border border-scene-line text-left">
            {[
              [t.battery.level, "%64"],
              [t.battery.health, t.battery.healthValue],
              [t.battery.storage, t.battery.storageValue],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3.5 py-2.5">
                <dt className="text-[13.5px] text-scene-ink-2">{k}</dt>
                <dd className="text-[13.5px] font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  const rows: { key: string; icon: LucideIcon; label: string; value: string; open?: () => void; badge?: boolean }[] = [
    { key: "wifi", icon: Wifi, label: t.rows.wifi, value: home || t.wifiOff },
    { key: "notifications", icon: Bell, label: t.rows.notifications, value: t.notificationsValue },
    { key: "location", icon: MapPin, label: t.rows.location, value: t.locationValue },
    { key: "battery", icon: BatteryFull, label: t.rows.battery, value: t.battery.status, open: () => onPage("battery") },
    { key: "apps", icon: LayoutGrid, label: t.rows.apps, value: "" },
    { key: "update", icon: RefreshCw, label: t.rows.update, value: updated ? t.upToDate : t.updateBadge, open: () => onPage("update"), badge: !updated },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="settings">
      {header(t.title, false)}
      <div className="px-3 py-2.5">
        <span className="flex h-10 items-center gap-2 rounded-full bg-scene-paper px-3.5 text-[14px] text-scene-ink-faint" aria-hidden="true">
          <Search className="size-4" strokeWidth={2} />
        </span>
      </div>
      <ul className="flex flex-col">
        {rows.map((row) => {
          const inner = (
            <>
              <span className={cn("flex size-9 flex-none items-center justify-center rounded-full", row.badge ? "bg-scene-red-soft text-scene-red" : "bg-scene-paper text-scene-ink-2")}>
                <row.icon className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-[14.5px] font-semibold">{row.label}</b>
                {row.value ? <span className={cn("truncate text-[12.5px]", row.badge ? "font-bold text-scene-red" : "text-scene-ink-muted")}>{row.value}</span> : null}
              </span>
              {row.open ? <ChevronRight className="size-4 flex-none text-scene-ink-faint" strokeWidth={2.4} aria-hidden="true" /> : null}
            </>
          );
          return (
            <li key={row.key}>
              {row.open ? (
                <button type="button" onClick={row.open} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left" data-testid={`settings-${row.key}`}>
                  {inner}
                </button>
              ) : (
                <span className="flex min-h-14 items-center gap-3 px-4 py-2">{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Kurulan uygulamanın kendi ekranı: Harita (süs harita) ya da El Feneri (açılıp kapanan fener, altta reklam şeridi). */
function RunApp({ app, index, isAdApp }: { app: ClientStoreApp | null; index: number; isAdApp: boolean }) {
  const t = getMessages().lab.setup;
  const [on, setOn] = useState(false);
  if (!app) return null;
  if (!isAdApp) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-scene-school-soft" data-testid={`run-${app.id}`}>
        {/* Süs harita: sokaklar, park ve "Buradasın". */}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,transparent_46%,var(--scene-white)_46%,var(--scene-white)_54%,transparent_54%),linear-gradient(0deg,transparent_30%,var(--scene-white)_30%,var(--scene-white)_36%,transparent_36%),linear-gradient(0deg,transparent_70%,var(--scene-white)_70%,var(--scene-white)_75%,transparent_75%),linear-gradient(90deg,transparent_15%,var(--scene-white)_15%,var(--scene-white)_19%,transparent_19%)]" />
        <span aria-hidden="true" className="absolute top-[12%] right-[8%] h-[16%] w-[30%] rounded-2xl bg-scene-green/30" />
        <span aria-hidden="true" className="absolute bottom-[10%] left-[24%] h-[12%] w-[18%] rounded-xl bg-scene-blue/20" />
        <div className="relative m-3 flex h-11 items-center gap-2 rounded-full bg-scene-white px-4 text-[14px] text-scene-ink-faint shadow-[0_4px_12px_var(--scene-shadow)]">
          <Search className="size-4" strokeWidth={2} aria-hidden="true" />
          {t.map.search}
        </div>
        <span className="absolute top-[52%] left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center text-scene-blue">
          <span className="mb-1 rounded-full bg-scene-white px-2.5 py-1 text-[11.5px] font-bold text-scene-ink shadow">{t.map.here}</span>
          <MapPin className="size-9 fill-scene-blue text-scene-white" strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    );
  }
  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col items-center justify-center gap-5 transition-colors", on ? "bg-scene-white" : "bg-scene-ink")} data-testid={`run-${app.id}`}>
      <span className={cn("text-[15px] font-bold", on ? "text-scene-ink" : "text-scene-white/80")}>{app.name}</span>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={cn(
          "flex size-28 cursor-pointer items-center justify-center rounded-full border-4 transition-colors",
          on ? "border-scene-amber bg-scene-amber-soft text-scene-amber-ink shadow-[0_0_60px_var(--scene-yellow)]" : "border-scene-white/30 bg-scene-white/10 text-scene-white",
        )}
        data-testid="flashlight-toggle"
      >
        <Flashlight className="size-12" strokeWidth={1.8} aria-hidden="true" />
        <span className="sr-only">{on ? t.flashlight.on : t.flashlight.off}</span>
      </button>
      {/* Ücretsiz uygulamanın altındaki küçük reklam şeridi (süs). */}
      <span aria-hidden="true" className="absolute inset-x-3 bottom-3 flex h-10 items-center gap-2 rounded-lg bg-scene-white/90 px-3 text-[11.5px] text-scene-ink-muted">
        <span className="rounded bg-scene-amber px-1.5 py-0.5 text-[10px] font-bold text-scene-ink">{t.flashlight.banner}</span>
        <AppGlyph app={app} index={index} className="size-6" />
      </span>
    </div>
  );
}

/**
 * Uygulamanın içindeki tam ekran reklam (sahte uyarı): geri sayım bitince yeniden başlar (korkutmak
 * için), × kapatır, TEMİZLE dosyayı indirir. "Hareketi azalt" açıkken yanıp sönmez.
 */
function FullScreenAd({ ad, busy, onClose, onClean }: { ad: ClientSetup["ad"]; busy: boolean; onClose: () => void; onClean: () => void }) {
  const t = getMessages().lab.setup.ad;
  const [n, setN] = useState(9);
  const titleId = useId();
  useEffect(() => {
    const timer = window.setInterval(() => setN((v) => (v <= 0 ? 9 : v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="absolute inset-0 z-30 flex flex-col bg-scene-red px-5 pt-3 pb-4 text-scene-white [animation:fade-in_.15s_ease-out_both]"
      data-testid="setup-ad"
    >
      <div className="flex items-center justify-between">
        <span className="rounded bg-scene-white/20 px-1.5 py-0.5 text-[10.5px] font-bold">{t.label}</span>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={t.close}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full text-scene-white/70"
          data-testid="ad-close"
        >
          <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-scene-white/15 motion-safe:animate-pulse">
          <ShieldCheck className="size-9" strokeWidth={2} />
        </span>
        <h2 id={titleId} className="font-heading text-[24px] leading-tight font-bold">
          {ad.title}
        </h2>
        <p className="text-[14.5px] leading-snug text-scene-white/90">{ad.text}</p>
        <span className="font-mono text-[34px] font-bold tabular-nums" aria-live="off">
          {format(t.timer, { n })}
        </span>
        <button
          type="button"
          onClick={onClean}
          disabled={busy}
          className="flex h-13 w-full max-w-[240px] cursor-pointer items-center justify-center rounded-xl bg-scene-white text-[18px] font-extrabold tracking-wide text-scene-red disabled:opacity-60"
          data-testid="ad-clean"
        >
          {ad.button}
        </button>
      </div>
      <span className="text-center font-mono text-[11px] text-scene-white/75">
        {t.label} · {ad.source}
      </span>
    </div>
  );
}
