"use client";

import { ChevronRight, Smartphone, Volume2, VolumeX } from "lucide-react";
import "@/components/device/phone.css";
import { useEffect, useRef, useState } from "react";
import type { CallerLook, TalkPlace } from "@/lib/lab/content";
import type { TalkLine } from "@/lib/lab/story";
import { format, getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { readMuted, writeMuted } from "../sound";
import "./stage.css";

/** Sehpa çiziminde kupanın yeri (görselin oranı olarak: sol, üst, sağ, alt); tıklama alanı buradan hesaplanır. */
const MUG_BOX = [0.0999, 0.1633, 0.2447, 0.4918] as const;
const TABLE_W = 2400;
const TABLE_H = 900;
/** Cevaptan sonra öğrencinin sözü altyazıda bu kadar durur, sonra sahne kapanır. */
const SAID_MS = 1600;

export type TalkSceneProps = {
  speaker: string;
  look: CallerLook;
  /** Evde sehpa (varsayılan) ya da okulda sıra. */
  place?: TalkPlace;
  /**
   * Söylenenler, sırayla "Devam" ile. Soruda sorudan önceki satırlar (son satırda seçenekler
   * gelir; boşsa sorunun metni söylenir); son konuşmada bütün satırlar (sonda `doneLabel`).
   */
  lines?: TalkLine[];
  /** Yüz yüze soru: karşıdakinin sözü (görevin metni), seçenekler ve cevabın gidişi. */
  question?: {
    text: string;
    options: string[];
    /** Seçim sunucuya gider; karşıdakinin cevabı döner (yoksa null, sahne hemen kapanır). */
    onAnswer: (option: number) => Promise<TalkLine | null>;
    /** "Telefona bak": konuşma bir süre kapanır, görev panelinden geri açılır. */
    onAway: () => void;
  };
  /** Son düğmenin yazısı ("Ekranına dön", "Raporu gör"); cevaptan ya da son satırdan sonra. */
  doneLabel?: string;
  onDone: () => void;
};

type Said = { option: number; reply: TalkLine | null | undefined };

/**
 * T3 karşılıklı konuşma, S1 sinema şeritleri (oda sahne şablonu, 18 Kasım, Murat): bulanık oda,
 * karşıda silik bir silüet (yüzü görünmez, nefes alır, konuşurken başını sallar), önde sehpa ve
 * üstünde telefon, kahve kupası, mandalina kâsesi; okulda (Şehir Kapısı) sıra, klavye ve telefon.
 * Söz üst şeritte altyazı (sesi varsa sesiyle), seçenekler alt şeritte (1, 2, 3 tuşlarıyla da).
 * Hangi cevabın doğru olduğu burada bilinmez: seçim sunucuda puanlanır, karşıdakinin cevabı da
 * seçimden sonra sunucudan gelir. Küçük sürpriz: kupaya dokununca bir yudum alınır.
 */
export function TalkScene({ speaker, look, place = "home", lines = [], question, doneLabel, onDone }: TalkSceneProps) {
  const t = getMessages().lab.stage.talk;
  const m = getMessages().lab;
  // Sorudan önce (ya da son konuşmada) kaçıncı satırda; soruda son satır seçeneklerle gelir.
  const [line, setLine] = useState(0);
  const [said, setSaid] = useState<Said | null>(null);
  const [talking, setTalking] = useState(true);
  const [muted, setMuted] = useState(readMuted);
  const first = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  // Ekrandaki söz: önce satırlar, sonra (satır yoksa) sorunun metni, seçimden sonra öğrencinin
  // sözü, en sonda karşıdakinin cevabı.
  const lastLine = Math.max(0, lines.length - 1);
  const asking = !!question && !said && line >= lastLine;
  const shown: {
    who: "them" | "you";
    text: string;
    voice: string | null;
    key: string;
  } = said
    ? said.reply
      ? {
          who: "them",
          text: said.reply.text,
          voice: said.reply.voice,
          key: "reply",
        }
      : {
          who: "you",
          text: question?.options[said.option] ?? "",
          voice: null,
          key: "you",
        }
    : lines.length > 0
      ? {
          who: "them",
          text: lines[Math.min(line, lastLine)].text,
          voice: lines[Math.min(line, lastLine)].voice,
          key: `l${line}`,
        }
      : { who: "them", text: question?.text ?? "", voice: null, key: "q" };
  const finished = said ? !!said.reply : !question && line >= lastLine;

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    if (shown.who !== "them") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- konuşurken başını sallar
    setTalking(true);
    const timer = window.setTimeout(() => setTalking(false), 2400);
    return () => window.clearTimeout(timer);
  }, [shown.key, shown.who]);

  // Satırın sesi (sitenin kendi mp3'ü); ses kapalıysa ya da çalınamazsa yalnızca altyazı.
  useEffect(() => {
    if (!shown.voice || muted) return;
    const audio = new Audio(shown.voice);
    audio.play().catch(() => {});
    return () => audio.pause();
  }, [shown.key, shown.voice, muted]);

  async function choose(option: number) {
    if (said || !question) return;
    setSaid({ option, reply: undefined });
    const wait = new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion() ? 300 : SAID_MS));
    const [reply] = await Promise.all([question.onAnswer(option).catch(() => null), wait]);
    if (!alive.current) return;
    if (reply) setSaid({ option, reply });
    else onDone();
  }

  // Seçenekler 1, 2, 3 tuşlarıyla da seçilir (yazı kutusundayken değil): tuş düğmeye basar.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest("input, textarea")) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      root.current?.querySelectorAll<HTMLButtonElement>("[data-testid=talk-choice]")[n - 1]?.click();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const options = question?.options ?? [];

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={format(t.open, { speaker })}
      className={cn("st-talk", talking && shown.who === "them" && "st-talking")}
      data-place={place}
      data-testid="talk-scene"
    >
      <div className="st-talk-room" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- süs görseli */}
        <img src="/stage/talk-room.webp" alt={""} draggable={false} />
      </div>
      <div className="st-talk-person" aria-hidden="true">
        <Silhouette look={look} />
      </div>
      {place === "school" ? (
        <div className="st-talk-desk" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- süs görseli: sıradaki klavye ve telefon */}
          <img src="/stage/talk-desk.webp" alt={""} draggable={false} />
        </div>
      ) : (
        <>
          <TalkTable cup={t.cup} />
          {/* Sehpadaki telefon: sitenin tek telefonu, yatay yatıyor (components/device). */}
          <div className="st-talk-phone" aria-hidden="true">
            <div className="dv-phone">
              <div className="dv-screen" />
            </div>
          </div>
        </>
      )}
      <div className="st-talk-grain" aria-hidden="true" />

      <div className="st-talk-top">
        <p key={shown.key} className={cn("st-talk-sub", shown.who === "you" && "st-talk-you")} aria-live="polite" data-testid="talk-sub">
          <b>{shown.who === "you" ? t.you : speaker}</b>
          {shown.text}
        </p>
        {lines.some((l) => l.voice) ? (
          <button
            type="button"
            aria-pressed={muted}
            onClick={() => {
              writeMuted(!muted);
              setMuted(!muted);
            }}
            className="st-talk-mute"
          >
            {muted ? <VolumeX className="size-4" strokeWidth={2.2} aria-hidden="true" /> : <Volume2 className="size-4" strokeWidth={2.2} aria-hidden="true" />}
            <span className="sr-only">{muted ? m.call.unmute : m.call.mute}</span>
          </button>
        ) : null}
      </div>
      <div className="st-talk-bottom">
        <div role="group" aria-label={t.choices} className="st-talk-choices">
          {finished ? (
            <button ref={first} type="button" className="st-talk-next" onClick={onDone} data-testid="talk-done">
              <span aria-hidden="true">
                <ChevronRight className="size-4" strokeWidth={2.6} />
              </span>
              {doneLabel}
            </button>
          ) : !asking && !said ? (
            <button ref={first} type="button" className="st-talk-next" onClick={() => setLine((n) => n + 1)} data-testid="talk-next">
              <span aria-hidden="true">
                <ChevronRight className="size-4" strokeWidth={2.6} />
              </span>
              {m.login.talk.next}
            </button>
          ) : (
            options.map((option, i) => (
              <button
                key={i}
                ref={i === 0 ? first : undefined}
                type="button"
                disabled={!!said}
                aria-pressed={said?.option === i}
                onClick={() => void choose(i)}
                data-testid="talk-choice"
              >
                <span aria-hidden="true">{i + 1}</span>
                {option}
              </button>
            ))
          )}
        </div>
        {question && !said ? (
          <button type="button" onClick={question.onAway} className="st-talk-away">
            <Smartphone className="size-4" strokeWidth={2.2} aria-hidden="true" />
            <span className="max-lg:sr-only">{t.away}</span>
          </button>
        ) : null}
        {asking ? <span className="sr-only">{t.keys}</span> : null}
      </div>
    </div>
  );
}

/** Silüetin çizimdeki ortası (viewBox 1000 × 600): dar kadrajda görünen dilim buraya ortalanır. */
const PERSON_X = 702;

/**
 * Karşıdaki kişinin silüeti: anne düşük topuzlu, baba kısa saçlı (elinde çay bardağı, kenarında
 * pencere ışığı); arkadaş (Deniz) kıvırcık saçlı ve kapüşonlu. Dar kadrajda (telefon) kişi
 * kesilmesin diye görünen dilim kişinin üstüne ortalanır.
 */
function Silhouette({ look }: { look: CallerLook }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      const ratio = box.clientWidth / Math.max(1, box.clientHeight);
      const w = Math.min(1000, 600 * ratio);
      const x = Math.max(0, Math.min(1000 - w, PERSON_X - w / 2));
      el.setAttribute("viewBox", ratio >= 1000 / 600 ? "0 0 1000 600" : `${x} 0 ${w} 600`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  if (look === "friend")
    return (
      <svg ref={svg} viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <g className="st-person">
          <g className="st-person-body">
            <path d="M586 486c2-80 28-128 76-144 18-6 30-8 40-8s22 2 40 8c48 16 74 64 76 144z" />
            <path d="M640 352c4-30 30-50 62-50s58 20 62 50c-18-10-38-14-62-14s-44 4-62 14z" />
            <rect x="686" y="292" width="30" height="46" rx="10" />
          </g>
          <g className="st-person-head">
            <path d="M654 252c-4-48 22-62 48-60 34 2 50 24 46 62-2 28-12 46-26 52h-40c-16-8-26-28-28-54z" />
            <circle cx="664" cy="212" r="18" />
            <circle cx="684" cy="198" r="19" />
            <circle cx="706" cy="194" r="19" />
            <circle cx="728" cy="200" r="18" />
            <circle cx="744" cy="216" r="15" />
            <circle cx="656" cy="232" r="13" />
            <path className="st-person-rim" d="M744 222c8 18 8 42 0 64" />
          </g>
          <path className="st-person-rim st-person-rim-soft" d="M742 346c34 12 56 44 64 90" />
        </g>
      </svg>
    );

  return (
    <svg ref={svg} viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
      <g className="st-person">
        <g className="st-person-body">
          <path
            d={
              look === "father"
                ? "M578 482c2-82 28-130 78-146 18-6 32-8 44-8s26 2 44 8c50 16 76 64 78 146z"
                : "M590 482c2-78 26-126 72-142 18-6 30-8 38-8s20 2 38 8c46 16 70 64 72 142z"
            }
          />
          <rect x="684" y="290" width="32" height="46" rx="10" />
          <path className="st-person-arms" d="M644 362c-26 30-22 72 18 80l40-6M756 362c26 30 22 72-18 80l-40-6" />
        </g>
        <g className="st-person-head">
          <path d="M652 250c-4-50 24-64 50-62 34 2 50 26 46 64-2 28-12 46-26 52h-42c-16-8-26-28-28-54z" />
          {look === "father" ? <path d="M650 236c-2-34 22-52 52-52 30 0 50 18 48 48-14-14-34-20-52-20s-34 8-48 24z" /> : <circle cx="662" cy="230" r="24" />}
          <path className="st-person-rim" d="M742 214c8 18 8 44 0 66" />
        </g>
        <path className="st-person-rim st-person-rim-soft" d="M740 340c34 12 56 44 64 90" />
        <path className="st-person-tea" d="M690 386c-2 10 4 17 5 24-1 7-3 13-2 18h16c1-5-1-11-2-18 1-7 7-14 5-24z" />
        <ellipse className="st-person-plate" cx="701" cy="430" rx="18" ry="4" />
      </g>
    </svg>
  );
}

/** Önde 3B çizilmiş sehpa; uzak kenarı bulanık. Kupaya dokununca bir yudum alınıp bırakılır. */
function TalkTable({ cup }: { cup: string }) {
  const box = useRef<HTMLDivElement>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const [sip, setSip] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const place = () => {
      const img = el.querySelector("img");
      if (!img || !hit.current) return;
      const k = Math.max(el.clientWidth / TABLE_W, el.clientHeight / TABLE_H);
      const iw = TABLE_W * k;
      const ih = TABLE_H * k;
      const px = parseFloat(getComputedStyle(img).objectPosition) / 100;
      const dx = (el.clientWidth - iw) * (Number.isNaN(px) ? 0.5 : px);
      const left = dx + MUG_BOX[0] * iw;
      const top = MUG_BOX[1] * ih;
      const width = (MUG_BOX[2] - MUG_BOX[0]) * iw;
      const height = (MUG_BOX[3] - MUG_BOX[1]) * ih;
      Object.assign(hit.current.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
      el.style.setProperty("--ox", `${left + width / 2}px`);
      el.style.setProperty("--oy", `${top + height / 2}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function drink() {
    if (sip) return;
    setSip(true);
    window.setTimeout(() => setSip(false), prefersReducedMotion() ? 300 : 2600);
  }

  return (
    <div ref={box} className={cn("st-talk-table", sip && "st-sip")}>
      {(["talk-table", "talk-table st-far", "mug-shadow st-mug-shadow", "talk-mug st-mug"] as const).map((name) => {
        const [file, ...rest] = name.split(" ");
        return (
          // eslint-disable-next-line @next/next/no-img-element -- süs görseli
          <img key={name} src={`/stage/${file}.webp`} alt={""} aria-hidden="true" draggable={false} className={cn("st-tbl", ...rest)} />
        );
      })}
      <button ref={hit} type="button" onClick={drink} aria-label={cup} className="st-mug-hit">
        <i className="st-steam" />
        <i className="st-steam st-steam-2" />
      </button>
    </div>
  );
}
