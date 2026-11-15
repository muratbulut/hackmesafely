import type { CSSProperties } from "react";
import { frameStepOf, frameTierOf, type FrameStep } from "@/lib/progress/frames";
import { cn } from "@/lib/utils";
import { bubbleDots, digitalGlyphs, digitalPixels, emberParts, sparkBolts } from "./geometry";
import "./frame.css";

/** CSS değişkenli stil (--d süre, --x/--y kayma). */
type Vars = CSSProperties & Record<`--${string}`, string>;
const vars = (v: Record<string, string>) => v as Vars;
const sec = (n: number) => `${n}s`;

/**
 * Seviyeye göre avatar çerçevesi (29, 16 Kasım; tuval "29+ Avatar çerçeveleri", son hâli):
 * 1 ince halka, 2-3 Baloncuk, 4-5 Şimşek, 6-7 Kor halka, 8-9 Dijital, 10 Kahraman. Çerçeve seçilmez,
 * seviyeden gelir. Boyut ve emoji büyüklüğü className ile verilir (UserAvatar gibi). Süs olarak
 * çizilir; seviye yanında yazılıdır.
 */
export function AvatarFrame({ level, emoji, className }: { level: number; emoji: string; className?: string }) {
  const tier = frameTierOf(level);
  const step = frameStepOf(level);
  return (
    <span aria-hidden="true" data-frame={tier} data-step={step} className={cn("af", `af-${step}`, className)}>
      {tier === "plain" ? <span className="af-ring af-plain" /> : null}
      {tier === "bubble" ? <Bubbles step={step} /> : null}
      {tier === "spark" ? <Sparks step={step} /> : null}
      {tier === "ember" ? <Ember step={step} /> : null}
      {tier === "digital" ? <Digital /> : null}
      {tier === "hero" ? <Hero /> : null}
      <span className="af-core">{emoji}</span>
      {tier === "digital" ? <span className="af-scan" /> : null}
    </span>
  );
}

function Deco({ front = false, children }: { front?: boolean; children: React.ReactNode }) {
  return (
    <svg className={cn("af-deco", front && "af-front")} viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function Bubbles({ step }: { step: FrameStep }) {
  return (
    <>
      <span className="af-ring af-soft" />
      <Deco front>
        {bubbleDots[step].map(([x, y, r, d, delay], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle className="af-bub" r={r} style={vars({ "--d": sec(d), animationDelay: sec(-delay) })} />
          </g>
        ))}
      </Deco>
    </>
  );
}

function Sparks({ step }: { step: FrameStep }) {
  return (
    <Deco front>
      <circle className="af-spark-ring" r="66" />
      {sparkBolts[step].map(([main, branch, d, delay], i) => {
        const style = vars({ "--d": sec(d), animationDelay: sec(delay) });
        return (
          <g key={i}>
            <polyline className="af-bolt af-bolt-main" points={main} style={style} />
            <polyline className="af-bolt af-bolt-branch" points={branch} style={style} />
          </g>
        );
      })}
    </Deco>
  );
}

function Ember({ step }: { step: FrameStep }) {
  const parts = emberParts[step];
  // Aynı sayfada birden çok çerçeve olabilir (kart ve "sıradaki ödül"); degrade kimlikleri ayrı.
  const id = `af-${step}`;
  return (
    <Deco>
      <defs>
        <radialGradient id={`${id}-kor`} cx=".5" cy=".5" r=".5">
          <stop offset=".62" className="af-kor-a" />
          <stop offset=".74" className="af-kor-b" />
          <stop offset=".84" className="af-kor-c" />
          <stop offset=".92" className="af-kor-d" />
          <stop offset="1" className="af-kor-a" />
        </radialGradient>
        <linearGradient id={`${id}-out`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="af-flame-a" />
          <stop offset=".35" className="af-flame-b" />
          <stop offset=".75" className="af-flame-c" />
          <stop offset="1" className="af-flame-d" />
        </linearGradient>
        <linearGradient id={`${id}-in`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="af-flame-in-a" />
          <stop offset=".5" className="af-flame-in-b" />
          <stop offset="1" className="af-flame-in-c" />
        </linearGradient>
      </defs>
      <circle className="af-kor" r="80" fill={`url(#${id}-kor)`} style={vars({ "--d": step === "calm" ? "2.8s" : "1.4s" })} />
      {parts.sparks.map(([x, y, r, d, delay], i) => (
        <circle key={`s${i}`} className="af-ember-dot" cx={x} cy={y} r={r} style={vars({ "--d": sec(d), animationDelay: sec(-delay) })} />
      ))}
      {parts.tongues.map(([x, y, , , delay], i) => (
        <g key={`t${i}`} transform={`translate(${x} ${y})`}>
          <g className="af-tongue" style={vars({ "--d": step === "calm" ? "0.8s" : "0.6s", animationDelay: sec(-delay) })}>
            <path d={parts.tongue[0]} fill={`url(#${id}-out)`} />
            <path className="af-tongue-in" d={parts.tongue[1]} fill={`url(#${id}-in)`} />
          </g>
        </g>
      ))}
      {parts.embers.map(([x, r, d, dx, dy, delay], i) => (
        <circle
          key={`e${i}`}
          className="af-ember"
          cx={x}
          cy="58"
          r={r}
          style={vars({ "--d": sec(d), "--x": `${dx}px`, "--y": `${dy}px`, animationDelay: sec(-delay) })}
        />
      ))}
    </Deco>
  );
}

function Digital() {
  return (
    <Deco>
      <circle className="af-glitch-a" r="65" />
      <circle className="af-glitch-b" r="65" />
      <circle className="af-dots-ring" r="74" />
      {digitalPixels.map(([x, y, size, color, d, delay], i) => (
        <rect key={i} className={`af-px af-px-${color}`} x={x} y={y} width={size} height={size} style={vars({ "--d": sec(d), animationDelay: sec(-delay) })} />
      ))}
      {digitalGlyphs.map(([text, x, y, d], i) => (
        <text key={`g${i}`} className="af-glyph" x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={vars({ "--d": sec(d) })}>
          {text}
        </text>
      ))}
    </Deco>
  );
}

function Hero() {
  return (
    <>
      <span className="af-ring af-hero-outer" />
      <span className="af-ring af-hero" />
      <span className="af-ring af-orbit" />
      <span className="af-ring af-orbit af-rev" />
      <svg className="af-crown" viewBox="0 0 30 26" aria-hidden="true" focusable="false">
        <path d="M3 22 L5 8 L11 14 L15 3 L19 14 L25 8 L27 22 Z" />
      </svg>
      <span className="af-eye" />
    </>
  );
}
