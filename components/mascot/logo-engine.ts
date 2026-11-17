import { logoGeometry } from "@/lib/brand";
import { prefersReducedMotion } from "@/lib/motion";

/*
 * Canlı logonun hareketi (logo tuvali Ç3 "Yavaştan hızlıya", site tuvali 17 Kasım):
 * göz 10 saniye hiç kıpırdamaz, sonra a'nın iç boşluğunda yavaştan hızlanarak gezer, duvarlara
 * çarpar (a vurulan yöne hafifçe esner), sonunda sağa sola hızla vurur.
 *  - "escape" (ana sayfa): göz a'dan aşağı kaçar, öbür a'da belirir; renk de o a'ya geçer.
 *  - "inside" (diğer sayfalar): göz a'nın içinde kalır, sakinleşir.
 * "Hareketi azalt" açıksa hiç başlamaz. Beklerken zamanlayıcıyla durur, kare kare çizim yalnızca
 * hareket sırasında yapılır. Değerler doğrudan SVG'ye yazılır, React yeniden çizmez.
 */

export type LogoMode = "escape" | "inside";

/** Hareketsiz bekleme süresi. */
export const LOGO_WAIT_MS = 10_000;
/** Gezme süresi ve hızın en yükseğe çıktığı süre. Ana sayfada uzun, diğer sayfalarda kısa. */
export const LOGO_ROAM_MS = { escape: 6_800, inside: 2_600 } as const;
const RAMP_MS = { escape: 6_000, inside: 2_200 } as const;
/** Son vuruşlar (sağa sola). */
export const LOGO_BANG_MS = 900;

const { hole, a } = logoGeometry;
/** Gözün iç boşlukta gidebildiği en uzak nokta ve kaçarken kaybolduğu uzaklık. */
const MAX = hole.r * 0.3;
const OUT = hole.r * 2.8;

type Phase = "idle" | "roam" | "bang" | "dive" | "rise";
type Letter = { root: Element; bang: Element; nudge: Element; nx: number; ny: number; k: number; hx: number; hy: number };

export type LogoEngine = {
  /** Gözün şu an durduğu a: 0 üstteki (hack me), 1 alttaki (safely). */
  current(): 0 | 1;
  stop(): void;
};

/**
 * Logoyu canlandırır. `mode` her turun başında sorulur (sayfa değişince logo yerinde kalır).
 * `onSwitch` göz öbür a'ya geçince haber verir (bakışın merkezi değişir).
 */
export function startLogoEngine(svg: SVGSVGElement, mode: () => LogoMode, onSwitch?: (current: 0 | 1) => void): LogoEngine {
  const letters: Letter[] = Array.from(svg.querySelectorAll(".mc-a"), (root) => ({
    root,
    bang: root.querySelector(".mc-bang")!,
    nudge: root.querySelector(".mc-nudge")!,
    nx: 0,
    ny: 0,
    k: 0,
    hx: 0,
    hy: 0,
  }));
  let cur: 0 | 1 = 0;
  let phase: Phase = "idle";
  let turn: LogoMode = "inside";
  let pt = 0;
  let last: number | null = null;
  let p = { x: 0, y: 0 };
  let v = { x: 0, y: 0 };
  let timer = 0;
  let frame = 0;
  let stopped = false;

  function show() {
    letters.forEach((l, i) => {
      l.root.classList.toggle("mc-a-on", i === cur);
      if (i === cur) l.bang.removeAttribute("opacity");
      else l.bang.setAttribute("opacity", "0");
    });
  }
  function rest() {
    letters.forEach((l) => {
      l.nx = l.ny = l.k = 0;
      l.bang.removeAttribute("transform");
      l.nudge.removeAttribute("transform");
    });
    p = { x: 0, y: 0 };
  }
  function wait() {
    phase = "idle";
    pt = 0;
    last = null;
    timer = window.setTimeout(begin, LOGO_WAIT_MS);
  }
  function begin() {
    if (stopped) return;
    // Hareket azaltılmışsa ya da sekme arkadaysa bu tur atlanır.
    if (prefersReducedMotion() || document.hidden) return wait();
    turn = mode();
    phase = "roam";
    pt = 0;
    last = null;
    const angle = Math.random() * Math.PI * 2;
    v = { x: Math.cos(angle) * 0.12, y: Math.sin(angle) * 0.12 * 0.8 };
    frame = window.requestAnimationFrame(step);
  }
  /** Duvara çarpma: a o yöne itilir ve esner. */
  function hit(l: Letter, nx: number, ny: number, force: number) {
    l.nx = nx * 16 * force;
    l.ny = ny * 10 * force;
    l.hx = nx;
    l.hy = ny;
    l.k = force;
  }

  function step(ts: number) {
    if (stopped) return;
    if (last === null) last = ts;
    const dt = Math.min(40, ts - last);
    last = ts;
    pt += dt;
    const l = letters[cur];

    if (phase === "roam") {
      const speed = 0.12 + Math.min(1, pt / RAMP_MS[turn]) * 0.5;
      const m = Math.hypot(v.x, v.y) || 1;
      v.x *= speed / m;
      v.y *= speed / m;
      p.x += v.x * dt;
      p.y += v.y * dt;
      const d = Math.hypot(p.x, p.y);
      if (d > MAX) {
        const nx = p.x / d;
        const ny = p.y / d;
        p.x = nx * MAX;
        p.y = ny * MAX;
        const dot = v.x * nx + v.y * ny;
        v.x -= 2 * dot * nx;
        v.y -= 2 * dot * ny;
        hit(l, nx, ny, Math.min(1, Math.hypot(v.x, v.y) / 0.55));
      }
      if (pt > LOGO_ROAM_MS[turn]) {
        phase = "bang";
        pt = 0;
        v = { x: 0.7, y: 0 };
      }
    } else if (phase === "bang") {
      p.x += v.x * dt;
      p.y *= 0.9;
      if (Math.abs(p.x) > MAX) {
        const side = Math.sign(p.x);
        p.x = side * MAX;
        v.x = -v.x;
        hit(l, side, 0, 1);
      }
      if (pt > LOGO_BANG_MS) {
        phase = turn === "escape" ? "dive" : "idle";
        pt = 0;
      }
    } else if (phase === "dive") {
      // Üstteki a'dan aşağı, alttakinden yukarı kaçar; öbür a'ya aynı yönden girer.
      const dir = cur === 0 ? 1 : -1;
      p.y += dir * 1.2 * dt;
      if (Math.abs(p.y) > OUT) {
        cur = cur === 0 ? 1 : 0;
        show();
        onSwitch?.(cur);
        p = { x: 0, y: -dir * OUT };
        phase = "rise";
      }
    } else if (phase === "rise") {
      const dir = Math.sign(p.y) || 1;
      p.y -= dir * 1.2 * dt;
      if (p.y * dir <= 0) {
        p.y = 0;
        phase = "idle";
        pt = 0;
      }
    } else {
      // Sakinleşme: göz ortaya döner, esneme söner; bitince bekleme başlar.
      const ease = Math.pow(0.92, dt / 16);
      p.x *= ease;
      p.y *= ease;
    }

    letters[cur].bang.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    let moving = phase !== "idle" || Math.hypot(p.x, p.y) > 0.5;
    for (const t of letters) {
      const fade = Math.pow(0.9, dt / 16);
      t.nx *= fade;
      t.ny *= fade;
      t.k *= Math.pow(0.87, dt / 16);
      if (t.k > 0.01 || Math.hypot(t.nx, t.ny) > 0.3) moving = true;
      const sx = 1 + 0.12 * t.k * Math.abs(t.hx);
      const sy = 1 + 0.12 * t.k * Math.abs(t.hy);
      // Esneme, vurulan kenarın karşısındaki kenar sabit kalacak biçimde.
      const ox = a.left + (a.right - a.left) * ((1 - t.hx) / 2);
      const oy = a.top + (a.bottom - a.top) * ((1 - t.hy) / 2);
      t.nudge.setAttribute(
        "transform",
        `translate(${t.nx.toFixed(1)} ${t.ny.toFixed(1)}) translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})`,
      );
    }
    if (moving) frame = window.requestAnimationFrame(step);
    else {
      rest();
      wait();
    }
  }

  show();
  wait();
  return {
    current: () => cur,
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      rest();
    },
  };
}
