// Ürün adı, isim hâli (logo) ve gözlü a simgesi yalnızca bu dosyada durur; isim değişince sadece burası değişir.

import { useId, type SVGProps } from "react";

// Slogan ve açıklama gibi metinler sözlükte (lib/i18n), ürün adı yerine "{brand}" yazılır.
export const brand = {
  name: "Hack Me Safely",
  // Paylaşım görselinin (opengraph-image) tam adresi buradan kurulur; alan adı değişince burası değişir.
  siteUrl: "https://hackmesafely.com",
  // Kaynak kodu (AGPL-3.0); alt bilgideki "Kaynak kodu" bağlantısı.
  sourceUrl: "https://github.com/muratbulut/carefulmode",
} as const;

/*
 * Maskot gözlü a'dır (aşağıda Wordmark ve components/mascot/Mascot.tsx). Gövde --logo, göz bebeği
 * --logo-eye; ikisi de iki temada globals.css'te tanımlı. Göz beyazı her temada beyazdır (maskotun
 * parçası, tema rengi değil). Hap biçimli eski maskot 17 Kasım'da kaldırıldı (Murat).
 */
export const EYE_WHITE = "#ffffff";

/** Gözlü a tek başına, durgun (profil kartının arkasındaki süs gibi). Süstür; rengi --logo. */
export function LogoA(props: SVGProps<SVGSVGElement>) {
  const { hole, eye } = logoGeometry;
  return (
    <svg viewBox="22 -556 606 574" aria-hidden="true" {...props}>
      <path d={LOGO_A} fill="var(--logo)" />
      <circle cx={hole.cx} cy={hole.cy} r={eye.ball} fill={EYE_WHITE} />
      <circle cx={hole.cx + eye.reach * 0.6} cy={hole.cy} r={eye.pupil} fill="var(--logo-eye)" />
      <circle cx={hole.cx + eye.reach * 0.6 + eye.pupil * 0.34} cy={hole.cy - eye.pupil * 0.4} r={eye.glint} fill={EYE_WHITE} />
    </svg>
  );
}

/** Gözlü a'nın çizgi hâli: arayüz ikonlarıyla (lucide) aynı ölçü ve çizgide, rengi currentColor. */
export function LogoLineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="13" r="6.5" />
      <path d="M17.5 7v12.5" />
      <circle cx="12.2" cy="13" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

// İsim hâli: alt alta "hack me / safely" (logo tuvali, 16 Kasım). Harfler Montserrat Alternates Bold'dan
// çizilmiş yollar (yazı tipi siteye yüklenmez); iki a tam alt alta durur, maskot a harfinin kendisidir:
// göz, a'nın iç boşluğunda. Ölçüler yazı tipinin 1000 birimlik em karesinde: harf aralığı -0,01 em,
// satır aralığı 1058 birim, a harfi iki satırda da x = 681'de başlar.
const LOGO_VIEW_BOX = "62 -752 4462 2022";
const LOGO_REST = [
  "M399-546Q499-546 561-486Q622-426 622-308L622 0L466 0L466-284Q466-348 438-379Q410-411 357-411Q298-411 263-374Q228-338 228-266L228 0L72 0L72-742L228-742L228-482Q259-513 303-529Q347-546 399-546M1703 8Q1617 8 1549-27Q1480-63 1442-126Q1403-189 1403-269Q1403-349 1442-412Q1480-475 1549-510Q1617-546 1703-546Q1788-546 1852-510Q1915-475 1944-409L1823-344Q1781-418 1702-418Q1641-418 1601-378Q1561-338 1561-269Q1561-200 1601-160Q1641-120 1702-120Q1782-120 1823-194L1944-128Q1915-64 1852-28Q1788 8 1703 8M2421 0L2251-211L2176-137L2176 0L2020 0L2020-742L2176-742L2176-322L2404-538L2590-538L2366-310L2610 0M3632-546Q3733-546 3793-486Q3852-427 3852-308L3852 0L3696 0L3696-284Q3696-348 3670-379Q3643-411 3594-411Q3539-411 3507-375Q3475-340 3475-270L3475 0L3319 0L3319-284Q3319-411 3217-411Q3163-411 3131-375Q3099-340 3099-270L3099 0L2943 0L2943-538L3092-538L3092-476Q3122-510 3166-528Q3209-546 3261-546Q3318-546 3364-523Q3410-501 3438-458Q3471-500 3522-523Q3572-546 3632-546M4259-117Q4301-117 4334-129Q4366-142 4394-169L4477-79Q4401 8 4255 8Q4164 8 4094-27Q4024-63 3986-126Q3948-189 3948-269Q3948-348 3986-411Q4023-475 4089-510Q4154-546 4236-546Q4313-546 4376-513Q4439-481 4477-419Q4514-358 4514-274L4116-197Q4133-157 4170-137Q4206-117 4259-117M4236-428Q4177-428 4140-390Q4103-352 4101-285L4363-336Q4352-378 4318-403Q4284-428 4236-428",
  "M413 1066Q346 1066 282 1050Q218 1033 180 1008L232 896Q268 919 319 934Q370 948 419 948Q518 948 518 899Q518 876 491 866Q464 856 408 849Q342 839 299 826Q256 813 225 780Q193 747 193 686Q193 635 223 596Q252 556 309 534Q365 512 442 512Q499 512 556 525Q612 537 649 559L597 670Q526 630 442 630Q392 630 367 644Q342 658 342 680Q342 705 369 715Q396 725 455 734Q521 745 563 758Q605 770 636 803Q667 836 667 895Q667 945 637 984Q607 1023 550 1045Q492 1066 413 1066M1595 509L1595 532L1733 532L1733 652L1599 652L1599 1058L1443 1058L1443 508Q1443 416 1498 362Q1552 308 1651 308Q1686 308 1718 316Q1749 323 1770 337L1729 450Q1702 431 1666 431Q1595 431 1595 509M2065 941Q2107 941 2140 929Q2172 916 2200 889L2283 979Q2207 1066 2061 1066Q1970 1066 1900 1031Q1830 995 1792 932Q1754 869 1754 789Q1754 710 1792 647Q1829 583 1895 548Q1960 512 2042 512Q2119 512 2182 545Q2245 577 2283 639Q2320 700 2320 784L1922 861Q1939 901 1976 921Q2012 941 2065 941M2042 630Q1983 630 1946 668Q1909 706 1907 773L2169 722Q2158 680 2124 655Q2090 630 2042 630M2608 1066Q2517 1066 2466 1018Q2415 969 2415 880L2415 316L2571 316L2571 871Q2571 905 2589 924Q2606 942 2638 942Q2650 942 2663 939Q2675 936 2682 932L2689 1053Q2650 1066 2608 1066M3142 520L3298 520L3298 968Q3298 1116 3223 1188Q3148 1260 3005 1260Q2929 1260 2862 1241Q2794 1222 2748 1186L2810 1074Q2844 1102 2893 1118Q2942 1134 2992 1134Q3070 1134 3106 1098Q3142 1062 3142 988L3142 970Q3112 1000 3071 1016Q3030 1032 2983 1032Q2877 1032 2815 972Q2753 911 2753 790L2753 520L2909 520L2909 767Q2909 898 3018 898Q3074 898 3108 862Q3142 825 3142 753",
] as const;
export const LOGO_A = "M462-538L618-538L618 0L469 0L469-62Q411 8 301 8Q225 8 164-26Q102-60 67-123Q32-186 32-269Q32-352 67-415Q102-478 164-512Q225-546 301-546Q404-546 462-481L462-538M328-120Q387-120 426-160Q465-201 465-269Q465-337 426-377Q387-418 328-418Q268-418 229-377Q190-337 190-269Q190-201 229-160Q268-120 328-120";

/** Logonun ölçüleri; canlı logo (components/mascot/logo-engine.ts) aynı sayıları kullanır. */
export const logoGeometry = {
  /** viewBox: sol, üst, genişlik, yükseklik. */
  box: { x: 62, y: -752, width: 4462, height: 2022 },
  /** a harfinin satırdaki yeri ve iki satırın taban çizgileri. */
  a: { x: 681, lines: [0, 1058], left: 32, right: 618, top: -546, bottom: 8 },
  /** a'nın iç boşluğu (gözün yuvası): merkez ve yarıçap, harfin kendi ölçüsünde. */
  hole: { cx: 328, cy: -269, r: 137.5 },
  /** Göz: beyaz top, göz bebeği, parıltı; bakarken en çok kayma. */
  eye: { ball: 99, pupil: 45.4, glint: 14, reach: 16.5 },
} as const;

/** Gözlü a'nın gözü (iç boşluğun ortasında). Göz bebeği varsayılan olarak biraz sağa bakar. */
function LogoEye({ live }: { live: boolean }) {
  const { hole, eye } = logoGeometry;
  // Canlı hâlde bakış --mc-x ile gelir (mascot.css); düz hâlde aynı yerde durur.
  const lookStyle = live ? undefined : { transform: `translate(${eye.reach * 0.6}px, 0)` };
  return (
    <>
      <circle className="mc-ball" cx={hole.cx} cy={hole.cy} r={eye.ball} fill={EYE_WHITE} />
      <g className="mc-look" style={lookStyle}>
        <g className="mc-eye">
          <circle cx={hole.cx} cy={hole.cy} r={eye.pupil} fill="var(--logo-eye)" />
          <circle cx={hole.cx + eye.pupil * 0.34} cy={hole.cy - eye.pupil * 0.4} r={eye.glint} fill={EYE_WHITE} />
        </g>
      </g>
    </>
  );
}

/**
 * İsim hâli (alt alta logo). Yüksekliği className ile verilir (genişlik oranla gelir); yazı rengi
 * currentColor, gözlü a --logo. Çevresindeki bağlantı ürün adını söylüyorsa süstür (varsayılan); tek
 * başına duruyorsa `labelled` ile ekran okuyucuya ürün adı okunur.
 *
 * Düz hâlde göz üstteki a'dadır. Canlı hâlde (`live`, üst menü) iki a'da da göz çizilir, hangisinin
 * göründüğünü ve hareketi components/mascot/logo-engine.ts yönetir; sınıflar mascot.css'te.
 */
export function Wordmark({
  labelled = false,
  live = false,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { labelled?: boolean; live?: boolean }) {
  const clip = useId();
  const a11y = labelled ? { role: "img", "aria-label": brand.name } : { "aria-hidden": true };
  const liveClass = live ? "mc mc-wordmark mc-follow mc-blink" : undefined;
  const { a, hole } = logoGeometry;
  return (
    <svg viewBox={LOGO_VIEW_BOX} fill="currentColor" {...a11y} {...props} className={[liveClass, className].filter(Boolean).join(" ") || undefined}>
      {live ? (
        <clipPath id={clip}>
          <circle cx={hole.cx} cy={hole.cy} r={hole.r * 1.02} />
        </clipPath>
      ) : null}
      {a.lines.map((y, i) => (
        <g key={y}>
          <path d={LOGO_REST[i]} />
          <g className={i === 0 ? "mc-a mc-a-on" : "mc-a"} transform={`translate(${a.x} ${y})`}>
            <g className="mc-nudge">
              <path className="mc-letter" d={LOGO_A} fill={i === 0 ? "var(--logo)" : undefined} />
              {live ? (
                <g clipPath={`url(#${clip})`}>
                  <g className="mc-bang" opacity={i === 0 ? undefined : 0}>
                    <LogoEye live />
                  </g>
                </g>
              ) : i === 0 ? (
                <LogoEye live={false} />
              ) : null}
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
