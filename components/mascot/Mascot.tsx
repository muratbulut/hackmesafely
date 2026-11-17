import { useId, type CSSProperties, type Ref } from "react";
import { EYE_WHITE, logoGeometry } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { glyphs, type MascotGlyph } from "./glyphs";
import "./mascot.css";

/**
 * Maskotun ruh hâlleri (eski logo tuvali, 17 Kasım; maskot artık logodaki gözlü a).
 * idle: her zamanki hâli, arada göz kırpar. look: odada bir bağlantıya dikkatle bakar.
 * shut: göz kapalı. suspicious: bildirilen mesaj (sarı, göz kısılır). surprised: şaşkın (mor).
 * happy: doğru karar (yeşil, göz güler). love: yeni rozet (kalp göz). hacked: yanlış karar (kırmızı, X).
 * sleep: uyku. off: 404'teki sıfır (gri, göz etrafa bakar). loading: yükleniyor (göz döner).
 * out: çıkış (göz kapanır, griye döner).
 */
export const mascotMoods = ["idle", "look", "shut", "suspicious", "surprised", "happy", "love", "hacked", "sleep", "off", "loading", "out"] as const;
export type MascotMood = (typeof mascotMoods)[number];

type Props = {
  mood?: MascotMood;
  /** Gövde: logodaki a ya da 404'teki sıfır. */
  glyph?: MascotGlyph;
  /** Dokunulunca: göz iç boşlukta sekip duvarlara vurur (404). */
  poke?: boolean;
  /** Renkli düğmenin içinde (yükleniyor): gövde düğmenin yazı rengini alır, göz beyazı çıkar. */
  onAccent?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<SVGSVGElement>;
};

/**
 * Maskot: harfin kendisi gövde, göz iç boşlukta. Her zaman süstür (aria-hidden); anlamı çevresindeki
 * düğme ya da durum metni söyler. Bakış yönü --mc-x / --mc-y ile gelir (useEyeTracking).
 */
export function Mascot({ mood = "idle", glyph = "a", poke = false, onAccent = false, className, style, ref }: Props) {
  const clip = useId();
  const { d, box, hole } = glyphs[glyph];
  const { ball, pupil, glint } = logoGeometry.eye;
  const { cx, cy } = hole;
  return (
    <svg
      ref={ref}
      viewBox={box}
      aria-hidden="true"
      focusable="false"
      data-mood={mood}
      className={cn("mc mc-mascot", `mc-mood-${mood}`, mood === "idle" && "mc-blink", poke && "mc-r-try", onAccent && "mc-on-accent", className)}
      style={style}
    >
      <defs>
        <clipPath id={`${clip}h`}>
          <circle cx={cx} cy={cy} r={hole.r * 1.02} />
        </clipPath>
        <clipPath id={`${clip}b`}>
          <circle cx={cx} cy={cy} r={ball} />
        </clipPath>
      </defs>
      <g className="mc-body">
        <path className="mc-trk" d={d} />
        <g clipPath={`url(#${clip}h)`}>
          <g className="mc-bang">
            <circle className="mc-ball" cx={cx} cy={cy} r={ball} fill={EYE_WHITE} />
            <g className="mc-look">
              <g className="mc-eye">
                <circle className="mc-pupil mc-ink" cx={cx} cy={cy} r={pupil} />
                <circle className="mc-glint" cx={cx + pupil * 0.34} cy={cy - pupil * 0.4} r={glint} fill={EYE_WHITE} />
              </g>
              <path
                className="mc-heart"
                fill="var(--pink)"
                d={`M${cx} ${cy + 46} C${cx - 82} ${cy - 5} ${cx - 33} ${cy - 63} ${cx} ${cy - 19} C${cx + 33} ${cy - 63} ${cx + 82} ${cy - 5} ${cx} ${cy + 46}Z`}
              />
              <path className="mc-x mc-stroke" strokeWidth="19" d={`M${cx - 38} ${cy - 38}L${cx + 38} ${cy + 38}M${cx + 38} ${cy - 38}L${cx - 38} ${cy + 38}`} />
            </g>
            <g className="mc-spin">
              <circle cx={cx} cy={cy} r={ball} fill="transparent" />
              <circle className="mc-ink" cx={cx + ball - pupil * 1.02} cy={cy} r={pupil * 0.82} />
            </g>
            <g clipPath={`url(#${clip}b)`}>
              <rect className="mc-lid" x={cx - ball - 2} y={cy - ball - 2} width={ball * 2 + 4} height={ball * 2 + 4} />
            </g>
            <path className="mc-arc mc-stroke" strokeWidth="16" d={`M${cx - 61} ${cy + 8}Q${cx} ${cy + 59} ${cx + 61} ${cy + 8}`} />
            <path className="mc-happy mc-stroke" strokeWidth="19" d={`M${cx - 54} ${cy + 22}Q${cx} ${cy - 61} ${cx + 54} ${cy + 22}`} />
          </g>
        </g>
      </g>
    </svg>
  );
}
