"use client";

import {
  ArrowLeft,
  BookA,
  Calendar,
  Camera,
  CloudSun,
  AlarmClock,
  Images,
  NotebookPen,
  Settings,
  Headphones,
  Castle,
  Check,
  ChevronRight,
  Crown,
  Download,
  Footprints,
  House,
  LoaderCircle,
  Music,
  Orbit,
  Palette,
  Search,
  ShieldAlert,
  Smartphone,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { ClientInstall, ClientStoreApp } from "@/lib/lab/client";
import type { SceneState } from "@/lib/lab/events";
import type { InstallAfter, InstallPrompt } from "@/lib/lab/story";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { cardIconMap } from "../training/card-icons";
import { AppIcon, useClock } from "../stage/common";

/** Oynatıcının kurulum eylemleri; her biri sürücüye gider, sonuç gelmezse null. */
export type InstallHandlers = {
  openFile: (itemId: string) => Promise<boolean>;
  installFile: (itemId: string) => Promise<void>;
  installApp: (appId: string) => Promise<{ prompts: InstallPrompt[]; after: InstallAfter | null } | null>;
  answerPermission: (appId: string, index: number, choice: number) => Promise<{ after: InstallAfter | null } | null>;
  openHomework: (appId: string) => Promise<string | null>;
};

type Props = {
  install: ClientInstall;
  state: SceneState;
  /** Mesajlar; ek basılınca dosya uyarıları bu telefonda açılır. */
  messages: (onAttachment: (itemId: string) => void) => ReactNode;
  /** Eki olan mesajın dosya adı ve boyutu (uyarıda yazar). */
  files: Record<string, { name: string; size: string }>;
  handlers: InstallHandlers;
};

type Screen = { app: "home" } | { app: "messages" } | { app: "store"; open: string | null } | { app: "game"; id: string };
type FileStep = "download" | "blocked" | "settings" | "confirm";
type Prompting = { appId: string; prompts: InstallPrompt[]; index: number };

const tileColors = ["bg-scene-blue", "bg-scene-orange", "bg-scene-green"];

/**
 * Kurulum görevli odanın telefonu (T1, Şehir Kapısı "Bu uygulama nereden geliyor?"): ana ekranda
 * Mesajlar ve Mağaza. Mesajdaki .apk eki telefonun kendi uyarılarıyla adım adım açılır (her adımda
 * vazgeçilebilir; hiçbir şey inmez, kurulmaz). Mağazada arama, uygulama sayfası, yükleme ve izin
 * pencereleri; gerçek oyunda ödev ekranı. Hangi uygulamanın kopya olduğu tarayıcıda bilinmez:
 * izinler kurulunca, sonrası son izinden sonra sunucudan gelir.
 */
export function InstallPhone({ install, state, messages, files, handlers }: Props) {
  const t = getMessages().lab.install;
  const [screen, setScreen] = useState<Screen>({ app: "home" });
  const [file, setFile] = useState<{ id: string; step: FileStep } | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [prompting, setPrompting] = useState<Prompting | null>(null);
  const [after, setAfter] = useState<Record<string, InstallAfter>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const installed = state.installed ?? [];
  const openedHomework = state.homework ?? [];

  async function step(next: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await next();
    } finally {
      setBusy(false);
    }
  }

  function startFile(id: string) {
    setAllowed(false);
    setFile({ id, step: (state.filesOpened ?? []).includes(id) ? "blocked" : "download" });
  }

  async function download() {
    if (!file) return;
    const id = file.id;
    await step(async () => {
      if (await handlers.openFile(id)) setFile({ id, step: "blocked" });
    });
  }

  async function installFile() {
    if (!file) return;
    const id = file.id;
    await step(async () => {
      await handlers.installFile(id);
      setFile(null);
    });
  }

  async function get(app: ClientStoreApp) {
    if (installing) return;
    setInstalling(app.id);
    // Kısa bir yükleme çubuğu; sonuç gelince izin pencereleri sırayla açılır.
    const wait = new Promise((resolve) => window.setTimeout(resolve, 900));
    const [result] = await Promise.all([handlers.installApp(app.id), wait]);
    setInstalling(null);
    if (!result) return;
    if (result.prompts.length > 0) setPrompting({ appId: app.id, prompts: result.prompts, index: 0 });
    else if (result.after) setAfter((all) => ({ ...all, [app.id]: result.after! }));
  }

  async function choose(choice: number) {
    if (!prompting) return;
    const { appId, prompts, index } = prompting;
    await step(async () => {
      const result = await handlers.answerPermission(appId, index, choice);
      if (!result) return;
      if (index + 1 < prompts.length) setPrompting({ appId, prompts, index: index + 1 });
      else setPrompting(null);
      if (result.after) {
        const next = result.after;
        setAfter((all) => ({ ...all, [appId]: next }));
        if (next.homework) setScreen({ app: "game", id: appId });
      }
    });
  }

  async function homework(appId: string) {
    await step(async () => {
      const text = await handlers.openHomework(appId);
      if (text) setDone(text);
    });
  }

  const fileInfo = file ? files[file.id] : null;
  const appById = (id: string) => install.apps.find((a) => a.id === id) ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-scene-white font-sans text-scene-ink" data-testid="install-phone">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {screen.app === "home" ? (
          <Home store={install.store} onOpen={(app) => setScreen(app === "store" ? { app: "store", open: null } : { app: "messages" })} />
        ) : null}
        <div className={cn("flex min-h-0 flex-1 flex-col", screen.app !== "messages" && "hidden")}>{messages(startFile)}</div>
        {screen.app === "store" ? (
          <Store
            install={install}
            open={screen.open}
            installed={installed}
            removed={removed}
            installing={installing}
            onOpenApp={(id) => setScreen({ app: "store", open: id })}
            onBack={() => setScreen({ app: "store", open: null })}
            onGet={get}
            onLaunch={(id) => setScreen({ app: "game", id })}
          />
        ) : null}
        {screen.app === "game" ? (
          <Game
            install={install}
            app={appById(screen.id)}
            after={after[screen.id] ?? null}
            opened={openedHomework.includes(screen.id)}
            done={done}
            busy={busy}
            onHomework={() => homework(screen.id)}
            onRemove={() => {
              setRemoved((all) => [...all, screen.id]);
              setScreen({ app: "store", open: null });
            }}
          />
        ) : null}
      </div>

      {screen.app !== "home" ? (
        <nav aria-label={t.homeLabel} className="flex h-12 flex-none items-center justify-center border-t border-scene-line bg-scene-paper">
          <button
            type="button"
            onClick={() => setScreen({ app: "home" })}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-[13px] font-bold text-scene-ink-2"
            data-testid="install-home"
          >
            <House className="size-4" strokeWidth={2.2} aria-hidden="true" />
            {t.home}
          </button>
        </nav>
      ) : null}

      {file && fileInfo ? (
        <FileFlow
          name={fileInfo.name}
          size={fileInfo.size}
          step={file.step}
          allowed={allowed}
          busy={busy}
          onCancel={() => setFile(null)}
          onDownload={download}
          onSettings={() => setFile({ id: file.id, step: "settings" })}
          onToggle={() => setAllowed((a) => !a)}
          onContinue={() => setFile({ id: file.id, step: "confirm" })}
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

/** Ana ekran: telefonun sahibinin uygulamaları (kurgusal), simgeye dokununca açılır. */
function Home({ store, onOpen }: { store: string; onOpen: (app: "messages" | "store") => void }) {
  const t = getMessages().lab.install;
  const apps = [
    { key: "messages" as const, label: t.apps.messages },
    { key: "store" as const, label: store || t.apps.store },
  ];
  const clock = useClock();
  return (
    <div
      className="flex flex-1 flex-col bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_srgb,var(--scene-blue)_22%,var(--scene-paper)),var(--scene-paper))] px-5 pt-6 pb-4"
      data-testid="install-home-screen"
    >
      {/* Saat ve tarih (süs), altında açılmayan süs simgeleri; açılan iki uygulama alttaki rafta. */}
      <div aria-hidden="true" className="flex flex-col items-center gap-0.5 pb-6 text-scene-ink">
        <span className="font-heading text-[44px] leading-none font-medium tabular-nums">{clock.time}</span>
        <span className="text-[13px] text-scene-ink-muted first-letter:uppercase">{clock.dateLong}</span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-4 gap-x-3 gap-y-5">
        {t.homeApps.map((name, i) => {
          const Icon = homeIcons[i % homeIcons.length];
          return (
            <span key={name} className="flex flex-col items-center gap-1.5 text-[11.5px] text-scene-ink-2">
              <span className="flex size-[50px] items-center justify-center rounded-[22%] bg-scene-white text-scene-ink-2 shadow-[0_3px_8px_var(--scene-shadow)]">
                <Icon className="size-[48%]" strokeWidth={2} />
              </span>
              {name}
            </span>
          );
        })}
      </div>
      <ul
        aria-label={t.homeLabel}
        className="mt-auto flex justify-center gap-8 rounded-[28px] border border-scene-line bg-scene-white/70 px-6 py-3 backdrop-blur"
      >
        {apps.map((app) => (
          <li key={app.key}>
            <button
              type="button"
              onClick={() => onOpen(app.key)}
              className="flex cursor-pointer flex-col items-center gap-1.5 text-[12.5px] font-bold text-scene-ink"
              data-testid={`install-app-${app.key}`}
            >
              <AppIcon app={app.key} className="size-[58px] shadow-[0_6px_14px_var(--scene-shadow)]" />
              {app.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const homeIcons: LucideIcon[] = [Camera, Images, AlarmClock, CloudSun, NotebookPen, Calendar, Headphones, Settings];

function AppTile({ app, index, className }: { app: ClientStoreApp; index: number; className?: string }) {
  const Icon = cardIconMap[app.icon];
  return (
    <span aria-hidden="true" className={cn("flex flex-none items-center justify-center rounded-[22%] text-scene-white", tileColors[index % tileColors.length], className)}>
      <Icon className="size-[55%]" strokeWidth={2.1} />
    </span>
  );
}

export function Store({
  install,
  open,
  installed,
  removed,
  installing,
  onOpenApp,
  onBack,
  onGet,
  onLaunch,
  queries,
}: {
  install: ClientInstall;
  /** Vitrindeki öneriler; verilmezse tek öneri `install.query` (telefon kurulumunda her uygulama). */
  queries?: string[];
  open: string | null;
  installed: string[];
  removed: string[];
  installing: string | null;
  onOpenApp: (id: string) => void;
  onBack: () => void;
  onGet: (app: ClientStoreApp) => void;
  onLaunch: (id: string) => void;
}) {
  const t = getMessages().lab.install;
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const app = open ? install.apps.find((a) => a.id === open) : undefined;

  const normal = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const words = searched ? normal(searched).split(" ").filter(Boolean) : [];
  const results = words.length > 0 ? install.apps.filter((a) => words.some((w) => normal(`${a.name} ${a.publisher}`).includes(w))) : [];

  if (app) {
    const index = install.apps.indexOf(app);
    const isInstalled = installed.includes(app.id);
    const isRemoved = removed.includes(app.id);
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="store-app-page">
        <div className="flex flex-none items-center gap-1 border-b border-scene-line px-2 py-1.5">
          <button type="button" onClick={onBack} aria-label={t.back} className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-scene-ink-2">
            <ArrowLeft className="size-5" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <span className="text-sm font-bold text-scene-ink-2">{install.store}</span>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex items-start gap-3.5">
            <AppTile app={app} index={index} className="size-[68px]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <b className="text-[19px] leading-tight">{app.name}</b>
              <span className="text-[13px] font-bold text-scene-green" data-testid="store-publisher">
                {app.publisher}
              </span>
              {app.category ? <span className="text-xs text-scene-ink-muted">{app.category}</span> : null}
            </span>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-scene-line rounded-xl border border-scene-line text-center">
            <div className="flex flex-col gap-0.5 px-2 py-2">
              <dt className="text-[11px] text-scene-ink-muted">{t.rating}</dt>
              <dd className="flex items-center justify-center gap-1 text-sm font-bold">
                {app.rating}
                <Star className="size-3.5 fill-current text-scene-amber" strokeWidth={2} aria-hidden="true" />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 px-2 py-2">
              <dt className="text-[11px] text-scene-ink-muted">{t.downloads}</dt>
              <dd className="text-sm font-bold">{app.downloads}</dd>
            </div>
          </dl>
          {isRemoved ? (
            <span className="flex h-11 items-center justify-center rounded-full border border-scene-line text-sm font-bold text-scene-ink-muted">{t.removed}</span>
          ) : installing === app.id ? (
            <span role="status" className="flex h-11 items-center justify-center gap-2 rounded-full bg-scene-paper text-sm font-bold text-scene-ink-2">
              <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2.4} aria-hidden="true" />
              {t.installing}
              <span aria-hidden="true" className="ml-1 h-1.5 w-20 overflow-hidden rounded-full bg-scene-line">
                <span className="block h-full w-full origin-left rounded-full bg-scene-green motion-safe:[animation:install-bar_.9s_ease-out_both]" />
              </span>
            </span>
          ) : isInstalled ? (
            <button
              type="button"
              onClick={() => onLaunch(app.id)}
              className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-scene-green text-[15px] font-bold text-scene-white"
              data-testid="store-launch"
            >
              {t.open}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onGet(app)}
              disabled={installing !== null}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-scene-green text-[15px] font-bold text-scene-white disabled:opacity-50"
              data-testid="store-get"
            >
              <Download className="size-4" strokeWidth={2.4} aria-hidden="true" />
              {t.get}
            </button>
          )}
          {app.text ? (
            <section className="flex flex-col gap-1">
              <h3 className="text-[13px] font-bold">{t.about}</h3>
              <p className="text-[14px] leading-snug text-scene-ink-2">{app.text}</p>
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="store">
      <form
        role="search"
        aria-label={t.searchLabel}
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query);
        }}
        className="flex flex-none items-center gap-2 border-b border-scene-line bg-scene-paper px-3 py-2.5"
      >
        <AppIcon app="store" className="size-8" />
        <label htmlFor={inputId} className="sr-only">
          {t.search}
        </label>
        <span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-scene-line bg-scene-white px-3">
          <Search className="size-4 flex-none text-scene-ink-faint" strokeWidth={2} aria-hidden="true" />
          <input
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={t.search}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-scene-ink outline-none placeholder:text-scene-ink-faint"
            data-testid="store-search"
          />
        </span>
      </form>
      {searched === null ? (
        <StoreShowcase
          queries={queries ?? (install.query ? [install.query] : [])}
          onSuggest={(q) => {
            setQuery(q);
            setSearched(q);
          }}
        />
      ) : null}
      {searched !== null ? (
        <section className="flex flex-col">
          <h2 className="px-4 pt-4 pb-2 text-[13px] font-bold text-scene-ink-muted">{format(t.results, { query: searched.trim() })}</h2>
          {results.length === 0 ? <p className="px-4 py-6 text-center text-sm text-scene-ink-faint">{t.noResults}</p> : null}
          <ul>
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => onOpenApp(result.id)}
                  className="flex w-full cursor-pointer items-center gap-3 border-b border-scene-line-soft px-4 py-3 text-left"
                  data-testid="store-result"
                >
                  <AppTile app={result} index={install.apps.indexOf(result)} className="size-12" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="truncate text-[15px]">{result.name}</b>
                    <span className="truncate text-[12.5px] text-scene-ink-2">{result.publisher}</span>
                    <span className="flex items-center gap-1 text-xs text-scene-ink-muted">
                      {result.rating}
                      <Star className="size-3 fill-current text-scene-amber" strokeWidth={2} aria-hidden="true" />
                      <span aria-hidden="true">·</span>
                      {result.downloads}
                    </span>
                  </span>
                  {installed.includes(result.id) && !removed.includes(result.id) ? (
                    <Check className="size-5 flex-none text-scene-green" strokeWidth={2.4} aria-label={t.installed} />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const showcaseIcons: LucideIcon[] = [Orbit, Music, BookA, Palette, Crown, Footprints];
const showcaseColors = ["bg-scene-blue", "bg-scene-violet", "bg-scene-orange", "bg-scene-red", "bg-scene-ink-2", "bg-scene-green"];

/**
 * Mağazanın ilk ekranı: en üstte odanın önerisi (odak noktası, ödevin adı), altında mağaza dolu
 * görünsün diye süs vitrin (kategoriler, öne çıkanlar, öğrenciler için). Vitrindeki uygulamalar
 * kurgusaldır ve açılmaz; odanın uygulamaları yalnızca aramayla bulunur.
 */
function StoreShowcase({ queries, onSuggest }: { queries: string[]; onSuggest: (query: string) => void }) {
  const t = getMessages().lab.install;
  const apps = t.showcase.apps;
  return (
    <div className="flex flex-col gap-5 pb-6">
      {queries.length > 0 ? (
        <div className="flex flex-col gap-2 px-4 pt-4">
          <span className="block text-[12px] font-bold text-scene-ink-muted">{t.suggestion}</span>
          {queries.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => onSuggest(query)}
              className="relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-scene-green bg-scene-white p-3 text-left shadow-[0_8px_20px_var(--scene-shadow)]"
              data-testid="store-suggestion"
            >
              <span aria-hidden="true" className="relative flex size-11 flex-none items-center justify-center rounded-full bg-scene-green text-scene-white">
                <span className="absolute inset-0 rounded-full bg-scene-green opacity-40 motion-safe:animate-ping" />
                <Search className="relative size-5" strokeWidth={2.4} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate text-[16px] text-scene-ink">{query}</b>
                <span className="text-[12.5px] text-scene-ink-muted">{t.suggestionHint}</span>
              </span>
              <ChevronRight className="size-5 flex-none text-scene-green" strokeWidth={2.4} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      <div aria-hidden="true" className="flex flex-col gap-5">
        <div className="flex gap-2 overflow-hidden px-4">
          {t.showcase.categories.map((name, i) => (
            <span
              key={name}
              className={cn(
                "flex h-8 flex-none items-center rounded-full border px-3 text-[13px] font-bold",
                i === 0 ? "border-scene-ink bg-scene-ink text-scene-white" : "border-scene-line text-scene-ink-2",
              )}
            >
              {name}
            </span>
          ))}
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="px-4 text-[14px] font-bold text-scene-ink">{t.showcase.featured}</h2>
          <div className="flex gap-3 overflow-hidden px-4">
            {apps.slice(0, 4).map((app, i) => (
              <span key={app.name} className="flex w-[76px] flex-none flex-col gap-1">
                <ShowcaseTile index={i} className="size-[76px]" />
                <span className="truncate text-[12px] font-bold text-scene-ink">{app.name}</span>
                <span className="flex items-center gap-0.5 text-[11px] text-scene-ink-muted">
                  {app.rating}
                  <Star className="size-2.5 fill-current text-scene-amber" strokeWidth={2} />
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="px-4 text-[14px] font-bold text-scene-ink">{t.showcase.students}</h2>
          <ul>
            {apps.slice(3).map((app, i) => (
              <li key={app.name} className="flex items-center gap-3 px-4 py-2">
                <ShowcaseTile index={i + 3} className="size-11" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-[14px] text-scene-ink">{app.name}</b>
                  <span className="flex items-center gap-1 text-[12px] text-scene-ink-muted">
                    {app.category}
                    <span>·</span>
                    {app.rating}
                    <Star className="size-2.5 fill-current text-scene-amber" strokeWidth={2} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ShowcaseTile({ index, className }: { index: number; className?: string }) {
  const Icon = showcaseIcons[index % showcaseIcons.length];
  return (
    <span className={cn("flex flex-none items-center justify-center rounded-[22%] text-scene-white", showcaseColors[index % showcaseColors.length], className)}>
      <Icon className="size-[50%]" strokeWidth={2.1} />
    </span>
  );
}

/** Oyun: gerçek oyunda ödev ekranı, kopyada ödev listesi olmayan boş ekran ve "Kaldır". */
function Game({
  install,
  app,
  after,
  opened,
  done,
  busy,
  onHomework,
  onRemove,
}: {
  install: ClientInstall;
  app: ClientStoreApp | null;
  after: InstallAfter | null;
  opened: boolean;
  done: string | null;
  busy: boolean;
  onHomework: () => void;
  onRemove: () => void;
}) {
  const t = getMessages().lab.install;
  if (!app) return null;
  const game = install.game ?? { title: app.name, homework: "", open: "" };
  const homework = after?.homework === true || opened;
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto bg-[linear-gradient(180deg,color-mix(in_srgb,var(--scene-violet)_30%,var(--scene-white)),var(--scene-white)_70%)] px-6 py-8 text-center"
      data-testid="install-game"
    >
      <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-[28%] bg-scene-white text-scene-violet shadow-[0_10px_24px_var(--scene-shadow)] motion-safe:[animation:pop_.4s_ease-out_both]">
        <Castle className="size-14" strokeWidth={1.8} />
      </span>
      <b className="font-heading text-[24px] leading-tight">{homework ? game.title : app.name}</b>
      {homework ? (
        <>
          <span className="rounded-full bg-scene-amber-soft px-3 py-1 text-[11px] font-bold tracking-[0.6px] text-scene-amber-ink">{t.game.kicker.toLocaleUpperCase("tr")}</span>
          <p className="text-[15px] leading-snug text-scene-ink-2">{game.homework}</p>
          {done || opened ? (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-scene-white px-4 py-3 text-[15px] font-bold text-scene-green shadow-[0_2px_8px_var(--scene-shadow)]" data-testid="homework-done">
              <Check className="size-5" strokeWidth={2.6} aria-hidden="true" />
              {done ?? game.homework}
            </p>
          ) : (
            <button
              type="button"
              onClick={onHomework}
              disabled={busy}
              className="flex h-12 cursor-pointer items-center justify-center rounded-full bg-scene-violet px-8 text-[16px] font-bold text-scene-white disabled:opacity-60"
              data-testid="homework-open"
            >
              {game.open}
            </button>
          )}
        </>
      ) : after && !after.homework ? (
        <>
          <p className="text-[15px] leading-snug text-scene-ink-2" data-testid="install-empty">
            {after.text}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-scene-line-strong bg-scene-white px-6 text-sm font-bold text-scene-ink"
            data-testid="install-remove"
          >
            {t.remove}
          </button>
        </>
      ) : (
        <LoaderCircle className="size-6 text-scene-ink-muted motion-safe:animate-spin" strokeWidth={2.2} aria-hidden="true" />
      )}
    </div>
  );
}

/** Telefonun izin penceresi: uygulamanın adı ve isteği, altında nedeni, seçenekler alt alta. */
export function PermissionPrompt({ app, prompt, busy, onChoose }: { app: string; prompt: InstallPrompt; busy: boolean; onChoose: (choice: number) => void }) {
  const t = getMessages().lab.install;
  const Icon = cardIconMap[prompt.icon];
  const titleId = useId();
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-scene-scrim/60 p-3 [animation:fade-in_.15s_ease-out_both]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[340px] rounded-[24px] bg-scene-white px-4 pt-5 pb-2 text-center shadow-floating motion-safe:[animation:perm-pop_.3s_ease-out_both]"
        data-testid="permission-prompt"
      >
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-scene-blue/15 text-scene-blue">
          <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <p id={titleId} className="mt-2.5 text-[15.5px] leading-snug">
          <span className="sr-only">{t.permissionLabel}</span>
          <b>{app}</b> {prompt.text}
        </p>
        {prompt.note ? <p className="mt-1 text-[13px] text-scene-ink-muted">{prompt.note}</p> : null}
        <div className="mt-3 flex flex-col divide-y divide-scene-line border-t border-scene-line">
          {prompt.choices.map((choice, i) => (
            <button
              key={choice}
              type="button"
              disabled={busy}
              onClick={() => onChoose(i)}
              className="min-h-11 cursor-pointer py-2.5 text-[15px] font-bold text-scene-blue disabled:opacity-50"
              data-testid="permission-choice"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Mesajdaki .apk eki: telefonun uyarıları sırayla (indir, yükleme engellendi, ayar, yükle).
 * Her adımda "İptal" var. Dosya inmez; yalnızca "indirdi" ve "yüklemek istedi" olayları gider.
 */
export function FileFlow({
  name,
  size,
  step,
  allowed,
  busy,
  onCancel,
  onDownload,
  onSettings,
  onToggle,
  onContinue,
  onInstall,
  source,
}: {
  name: string;
  size: string;
  step: FileStep;
  allowed: boolean;
  busy: boolean;
  /** Dosyanın geldiği uygulama (Ayarlar'daki izin satırı); yazılmazsa Mesajlar. */
  source?: { name: string; icon: ReactNode };
  onCancel: () => void;
  onDownload: () => void;
  onSettings: () => void;
  onToggle: () => void;
  onContinue: () => void;
  onInstall: () => void;
}) {
  const t = getMessages().lab.install.file;
  const titleId = useId();
  const toggleId = useId();

  if (step === "settings") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-scene-white [animation:fade-in_.15s_ease-out_both]" data-testid="file-settings">
        <div className="flex flex-none items-center gap-1 border-b border-scene-line px-2 py-1.5">
          <button type="button" onClick={onCancel} aria-label={getMessages().lab.install.back} className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-scene-ink-2">
            <ArrowLeft className="size-5" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <h2 className="text-[15px] font-bold">{t.settingsTitle}</h2>
        </div>
        <div className="flex flex-col gap-4 px-4 py-5">
          <span className="flex items-center gap-3">
            {source ? source.icon : <AppIcon app="messages" className="size-10" />}
            <b className="text-[15px]">{source ? source.name : t.settingsApp}</b>
          </span>
          <label htmlFor={toggleId} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-scene-line px-3.5 py-2.5">
            <span className="text-[15px]">{t.settingsToggle}</span>
            <input id={toggleId} type="checkbox" role="switch" checked={allowed} onChange={onToggle} className="peer sr-only" data-testid="file-allow" />
            <span
              aria-hidden="true"
              className={cn(
                "relative h-7 w-12 flex-none rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-scene-blue",
                allowed ? "bg-scene-green" : "bg-scene-line-strong",
              )}
            >
              <span className={cn("absolute top-1 size-5 rounded-full bg-scene-white shadow transition-[left]", allowed ? "left-6" : "left-1")} />
            </span>
          </label>
          <p className="flex items-start gap-2 text-[13px] leading-snug text-scene-ink-muted">
            <ShieldAlert className="mt-0.5 size-4 flex-none" strokeWidth={2} aria-hidden="true" />
            {t.settingsNote}
          </p>
          <button
            type="button"
            onClick={onContinue}
            disabled={!allowed}
            className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-scene-blue text-[15px] font-bold text-scene-white disabled:cursor-default disabled:opacity-40"
            data-testid="file-continue"
          >
            {t.settingsContinue}
          </button>
        </div>
      </div>
    );
  }

  const content = {
    download: { title: format(t.downloadTitle, { name }), text: t.downloadText, ok: t.download, onOk: onDownload },
    blocked: { title: t.blockedTitle, text: t.blockedText, ok: t.settings, onOk: onSettings },
    confirm: { title: t.installTitle, text: "", ok: t.install, onOk: onInstall },
  }[step];

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-scene-scrim/60 p-3 [animation:fade-in_.15s_ease-out_both]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[340px] rounded-[24px] bg-scene-white px-5 pt-5 pb-3 shadow-floating motion-safe:[animation:perm-pop_.3s_ease-out_both]"
        data-testid={`file-${step}`}
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-scene-red-soft text-scene-red">
            <Smartphone className="size-5" strokeWidth={2.1} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <b className="truncate text-[14px]">{name}</b>
            <span className="text-xs text-scene-ink-muted">
              {t.fileApp}
              {size ? ` · ${size}` : ""}
            </span>
          </span>
        </span>
        <h2 id={titleId} className="mt-3.5 text-[17px] leading-snug font-bold">
          {content.title}
        </h2>
        {content.text ? <p className="mt-1.5 text-[14px] leading-snug text-scene-ink-2">{content.text}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 cursor-pointer rounded-full px-4 text-[14px] font-bold text-scene-blue" data-testid="file-cancel">
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={content.onOk}
            disabled={busy}
            className="h-10 cursor-pointer rounded-full bg-scene-blue px-5 text-[14px] font-bold text-scene-white disabled:opacity-50"
            data-testid="file-ok"
          >
            {content.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

