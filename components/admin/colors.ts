// Mahalle renkleri (Neighborhood.color tema rengi adıdır). Tailwind sınıfları tam yazılır.

const colors = {
  success: { dot: "bg-success", chip: "bg-success/12 text-success-fg", border: "border-success" },
  accent: { dot: "bg-accent", chip: "bg-accent/12 text-accent-fg", border: "border-accent" },
  purple: { dot: "bg-purple", chip: "bg-purple/12 text-purple-fg", border: "border-purple" },
  warning: { dot: "bg-warning", chip: "bg-warning/12 text-warning-fg", border: "border-warning" },
  pink: { dot: "bg-pink", chip: "bg-pink/12 text-pink-fg", border: "border-pink" },
} as const;

export function neighborhoodColor(name: string) {
  return colors[name as keyof typeof colors] ?? colors.accent;
}

/** Oda durumunun rengi (39, 17 Kasım): yayında yeşil, taslak sarı, gizli gri. */
export const statusColors = {
  PUBLISHED: { dot: "bg-success", badge: "bg-success/14 text-success-fg", tile: "border-success", text: "text-success-fg" },
  DRAFT: { dot: "bg-warning", badge: "bg-warning/14 text-warning-fg", tile: "border-warning", text: "text-warning-fg" },
  HIDDEN: { dot: "bg-fg-4", badge: "bg-card text-fg-3", tile: "border-fg-3", text: "text-fg-3" },
} as const;

/** Sahnedeki gönderen avatarlarının renkleri (kurgusal uygulamaların kendi renkleri). */
export const avatarColors = ["bg-scene-amber", "bg-scene-blue", "bg-scene-green", "bg-scene-violet", "bg-scene-orange"] as const;
