"use client";

import type { ReactNode } from "react";
import { PhoneStatus } from "@/components/device/Phone";
import { useDragScroll } from "@/components/device/drag-scroll";
import "@/components/device/phone.css";

/**
 * Masaüstünde sahneyi bir telefonun içinde açar (satış görevli oda, Murat 2 Kasım: Mesajlar Postam'a
 * benzemesin, öğrenci telefonundaki uygulamalara bakıyormuş gibi olsun). Çerçeve ve durum çubuğu sitenin
 * tek telefonundandır (19 Kasım) ve yalnızca masaüstünde görünür; telefonda sahne zaten tam ekrandır.
 * İçerideki sahne `data-device="phone"` ile her ekran genişliğinde telefon düzeninde kalır
 * (`desk`/`wide` kırılımları, globals.css).
 */
export function PhoneFrame({ children, inert }: { children: ReactNode; inert?: boolean }) {
  useDragScroll();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:h-[var(--lab-height)] lg:items-center lg:justify-center" data-testid="phone-frame">
      {/* Geniş ekranda sitenin tek telefonu (components/device/phone.css), telefonda çerçevesiz. */}
      <div className="dv-frame relative flex min-h-0 w-full flex-1 flex-col">
        <div inert={inert} data-device="phone" className="dv-frame-screen relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-scene-white">
          <PhoneStatus className="max-lg:hidden" />
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
