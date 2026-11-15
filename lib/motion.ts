// "Hareketi azalt" (29, 11 Kasım): cihazın ayarına ek olarak sitenin kendi ayarı. Okul bilgisayarında
// öğrenci cihaz ayarını değiştiremeyebilir; profil > Görünüm'deki anahtar "motion" çerezine yazar.
// Tema gibi: <head> içindeki küçük betik çerezi okuyup ilk boyamadan önce <html data-motion="reduce">
// koyar, sayfa statik kalır. CSS'te motion-safe / motion-reduce (globals.css) ve "Hareketi azalt"
// blokları ikisine de bakar; betikler prefersReducedMotion() ile sorar.

export const MOTION_COOKIE = "motion";
export const MOTION_ATTRIBUTE = "data-motion";
export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** document.cookie metninden sitenin ayarını okur: yalnızca "reduce" kabul edilir. */
export function motionFromCookie(cookies: string): boolean {
  return new RegExp(`(?:^|;\\s*)${MOTION_COOKIE}=reduce(?:;|$)`).test(cookies);
}

/** Ayar açıksa bir yıllık çerez, kapanınca çerez silinir. */
export function motionCookie(reduce: boolean, secure: boolean): string {
  const tail = `; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  return reduce ? `${MOTION_COOKIE}=reduce; Max-Age=${ONE_YEAR}${tail}` : `${MOTION_COOKIE}=; Max-Age=0${tail}`;
}

/** <head> içinde, ilk boyamadan önce çalışan betik. */
export const MOTION_SCRIPT = `(function(){try{if(/(?:^|;\\s*)${MOTION_COOKIE}=reduce(?:;|$)/.test(document.cookie))document.documentElement.setAttribute("${MOTION_ATTRIBUTE}","reduce")}catch(e){}})()`;

/** Sitenin ayarı açık mı (yalnızca tarayıcıda; sunucuda kapalı). */
export function siteReducesMotion(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute(MOTION_ATTRIBUTE) === "reduce";
}

/** Hareket azaltılsın mı: sitenin ayarı ya da cihazın ayarı. Sunucuda false. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return siteReducesMotion() || (typeof window.matchMedia === "function" && window.matchMedia(REDUCE_QUERY).matches);
}

/** İki ayardan biri değişince haber verir; dinlemeyi bırakan işlevi döndürür. */
export function onReducedMotionChange(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = typeof window.matchMedia === "function" ? window.matchMedia(REDUCE_QUERY) : null;
  media?.addEventListener("change", onChange);
  const observer = typeof MutationObserver === "function" ? new MutationObserver(onChange) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: [MOTION_ATTRIBUTE] });
  return () => {
    media?.removeEventListener("change", onChange);
    observer?.disconnect();
  };
}
