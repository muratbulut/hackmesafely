import type { CSSProperties } from "react";
import type { CardBackgroundCode } from "@/lib/progress/frames";
import { cn } from "@/lib/utils";
import { nightStars } from "./geometry";
import "./frame.css";

type Vars = CSSProperties & Record<`--${string}`, string>;
const vars = (v: Record<string, string | number>) => v as Vars;

// Bulutlar ve kuzey ışıkları: [genişlik, yükseklik, sol, üst, saydamlık, süre, kayma x, kayma y] (px, sn).
const clouds = [
  [360, 90, 60, 60, 0.16, 22, 46, 0],
  [300, 76, 620, 130, 0.12, 27, -40, 0],
  [420, 100, 880, 40, 0.14, 24, 36, 0],
  [260, 66, 300, 240, 0.1, 30, -32, 0],
  [340, 84, 1000, 250, 0.12, 26, 30, 0],
] as const;
const auroras = [
  [520, 260, 80, -60, 1, 14, 120, 30],
  [480, 240, 600, 40, 2, 17, -100, -20],
  [420, 220, 900, -40, 3, 15, -60, 40],
] as const;

/** Soldan uzaklık kartın genişliğine göre: telefonda da bulutlar karta yayılır. */
const pct = (left: number) => `${((left / 1312) * 100).toFixed(1)}%`;

const wave = (y: number, amp: number) => `M-80 ${y} Q 120 ${y - amp}, 320 ${y} T 720 ${y} T 1120 ${y} T 1520 ${y} L 1520 460 L -80 460 Z`;

/**
 * Profil kartının arka planı (29, 16 Kasım): kartın arkasında, içeriğin altında durur. "Sade"de
 * hiçbir şey çizilmez (kartın kendi zemini kalır). Hepsi çok yavaş; "Hareketi azalt"ta durur.
 */
export function CardBackdrop({ code, className }: { code: CardBackgroundCode; className?: string }) {
  if (code === "plain") return null;
  return (
    <span aria-hidden="true" data-backdrop={code} className={cn("af-bg", `af-bg-${code}`, className)}>
      {code === "waves" ? (
        <svg viewBox="0 0 1312 440" preserveAspectRatio="none" focusable="false">
          <path className="af-wave af-wave-1" d={wave(300, 26)} style={vars({ "--d": "16s" })} />
          <path className="af-wave af-wave-2" d={wave(340, 20)} style={vars({ "--d": "21s" })} />
          <path className="af-wave af-wave-3" d={wave(378, 16)} style={vars({ "--d": "26s" })} />
        </svg>
      ) : null}
      {code === "clouds"
        ? clouds.map(([w, h, left, top, opacity, d, x], i) => (
            <span key={i} className="af-cloud" style={vars({ width: w, height: h, left: pct(left), top, opacity, "--d": `${d}s`, "--x": `${x}px` })} />
          ))
        : null}
      {code === "night" ? (
        <>
          <svg viewBox="0 0 1312 440" preserveAspectRatio="xMidYMid slice" focusable="false">
            {nightStars.map(([cx, cy, r, d, delay], i) => (
              <circle key={i} className="af-star" cx={cx} cy={cy} r={r} style={vars({ "--d": `${d}s`, animationDelay: `-${delay}s` })} />
            ))}
            <circle className="af-moon" cx="1180" cy="80" r="34" />
            <circle className="af-moon-cut" cx="1196" cy="70" r="30" />
          </svg>
          <span className="af-shoot" style={vars({ left: "10%", top: 60, "--d": "9s" })} />
          <span className="af-shoot" style={vars({ left: "55%", top: 140, "--d": "13s", animationDelay: "-5s" })} />
        </>
      ) : null}
      {code === "aurora"
        ? auroras.map(([w, h, left, top, color, d, x, y], i) => (
            <span
              key={i}
              className="af-aurora"
              style={vars({ width: w, height: h, left: pct(left), top, background: `var(--card-bg-aurora-${color})`, "--d": `${d}s`, "--x": `${x}px`, "--y": `${y}px` })}
            />
          ))
        : null}
    </span>
  );
}
