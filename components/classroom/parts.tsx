// Sınıf detayının ortak parçaları (hoca öncesi kontrol 33): durum renkleri, halka, kart, avatar.

import type { ReactNode } from "react";
import { initialOf, type StudentStatus } from "@/lib/classroom/teacher-rules";
import { cn } from "@/lib/utils";

/** Durumların sırası: önce dikkat isteyen. */
export const statusOrder: StudentStatus[] = ["notStarted", "inProgress", "finished"];
export const statusFill: Record<StudentStatus, string> = { finished: "bg-success", inProgress: "bg-accent", notStarted: "bg-warning" };
export const statusStroke: Record<StudentStatus, string> = { finished: "stroke-success", inProgress: "stroke-accent", notStarted: "stroke-warning" };
export const statusFg: Record<StudentStatus, string> = { finished: "text-success-fg", inProgress: "text-accent-fg", notStarted: "text-warning-fg" };

/** Dilimli halka: her dilim değeri kadar yer kaplar, aralarında küçük boşluk kalır. */
export function Donut({
  parts,
  size,
  stroke,
  label,
  children,
}: {
  parts: { value: number; className: string }[];
  size: number;
  stroke: number;
  /** Ekran okuyucu için halkanın tek cümlelik özeti. */
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const gap = parts.filter((p) => p.value > 0).length > 1 ? 6 : 0;
  const lens = parts.map((p) => (total > 0 ? (p.value / total) * length : 0));
  const arcs = parts.map((p, i) => ({ ...p, len: lens[i], offset: lens.slice(0, i).reduce((sum, len) => sum + len, 0) }));
  return (
    <span role="img" aria-label={label} className="relative flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-card" />
        {arcs.map((arc, i) =>
          arc.value > 0 ? (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(arc.len - gap, 1)} ${length}`}
              strokeDashoffset={-arc.offset}
              className={arc.className}
            />
          ) : null,
        )}
      </svg>
      <span aria-hidden="true" className="relative flex flex-col items-center text-center">
        {children}
      </span>
    </span>
  );
}

/** Sınıf detayının kartı. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("relative flex flex-col gap-3 overflow-hidden rounded-[20px] border border-line bg-surface p-4 lg:p-5", className)} {...rest}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-[11px] font-bold tracking-[1.5px] text-fg-3 uppercase", className)}>{children}</span>;
}

/** Öğrencinin baş harfi (fotoğraf yok). */
export function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex size-9 flex-none items-center justify-center rounded-full bg-card font-bold text-accent-light", className)}>
      {initialOf(name)}
    </span>
  );
}

/** Ödevin odaları için kareler: bitirdiği renkli. */
export function LabDots({ done, fill, size = "size-2.5" }: { done: boolean[]; fill: string; size?: string }) {
  return (
    <span aria-hidden="true" className="flex flex-none gap-1">
      {done.map((d, i) => (
        <span key={i} className={cn("rounded-[3px]", size, d ? fill : "bg-line")} />
      ))}
    </span>
  );
}
