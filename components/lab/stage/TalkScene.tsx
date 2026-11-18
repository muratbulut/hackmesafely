"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CallerLook } from "@/lib/lab/content";
import { format, getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
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
  /** Karşıdakinin sözü (soru görevinin metni). */
  text: string;
  options: string[];
  onAnswer: (option: number) => void;
  /** "Telefona bak": konuşma bir süre kapanır, görev panelinden geri açılır. */
  onAway: () => void;
};

/**
 * T3 karşılıklı konuşma, S1 sinema şeritleri (oda sahne şablonu, 18 Kasım, Murat): bulanık oda,
 * karşıda silik bir silüet (yüzü görünmez, nefes alır, konuşurken başını sallar), önde sehpa ve
 * üstünde telefon, kahve kupası, mandalina kâsesi. Söz üst şeritte altyazı, seçenekler alt şeritte
 * (1, 2, 3 tuşlarıyla da). Hangi cevabın doğru olduğu burada bilinmez: seçim sunucuda puanlanır.
 * Küçük sürpriz: kupaya dokununca bir yudum alınır.
 */
export function TalkScene({ speaker, look, text, options, onAnswer, onAway }: TalkSceneProps) {
  const t = getMessages().lab.stage.talk;
  const [said, setSaid] = useState<number | null>(null);
  const [talking, setTalking] = useState(true);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setTalking(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(option: number) {
    if (said !== null) return;
    setSaid(option);
    window.setTimeout(() => onAnswer(option), prefersReducedMotion() ? 300 : SAID_MS);
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

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={format(t.open, { speaker })}
      className={cn("st-talk", talking && "st-talking")}
      data-testid="talk-scene"
    >
      <div className="st-talk-room" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- süs görseli */}
        <img src="/stage/talk-room.webp" alt={""} draggable={false} />
      </div>
      <div className="st-talk-person" aria-hidden="true">
        <Silhouette look={look} />
      </div>
      <TalkTable cup={t.cup} />
      <span className="st-talk-phone" aria-hidden="true" />
      <div className="st-talk-grain" aria-hidden="true" />

      <div className="st-talk-top">
        <p key={said ?? "q"} className={cn("st-talk-sub", said !== null && "st-talk-you")} aria-live="polite">
          <b>{said !== null ? t.you : speaker}</b>
          {said !== null ? options[said] : text}
        </p>
      </div>
      <div className="st-talk-bottom">
        <div role="group" aria-label={t.choices} className="st-talk-choices">
          {options.map((option, i) => (
            <button
              key={i}
              ref={i === 0 ? first : undefined}
              type="button"
              disabled={said !== null}
              aria-pressed={said === i}
              onClick={() => choose(i)}
              data-testid="talk-choice"
            >
              <span aria-hidden="true">{i + 1}</span>
              {option}
            </button>
          ))}
        </div>
        <button type="button" onClick={onAway} disabled={said !== null} className="st-talk-away">
          <Smartphone className="size-4" strokeWidth={2.2} aria-hidden="true" />
          <span className="max-lg:sr-only">{t.away}</span>
        </button>
        <span className="sr-only">{t.keys}</span>
      </div>
    </div>
  );
}

/** Karşıdaki kişinin silüeti: anne düşük topuzlu, baba kısa saçlı; elinde çay bardağı, kenarında pencere ışığı. */
function Silhouette({ look }: { look: CallerLook }) {
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
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
