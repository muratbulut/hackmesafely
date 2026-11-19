import type { ReactNode } from "react";
import { Computer, ComputerDesktop, ComputerWindow } from "@/components/device/Computer";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Eğitim kartındaki mail (tıkla bul, bağlantıya bakma): sitenin tek bilgisayarında, M1 masaüstündeki
 * Postam penceresinde açılır (19 Kasım, Murat). Telefon genişliğinde pencere bütün ekranı kaplar.
 */
export function MailComputer({ className, children }: { className?: string; children: ReactNode }) {
  const m = getMessages().lab;
  return (
    <Computer k={0.8} className={cn("w-full", className)}>
      <ComputerDesktop
        narrow="phone"
        apps={[
          { app: "postam", label: m.inbox.app, active: true },
          { app: "browser", label: m.stage.browser, open: false },
        ]}
      >
        <ComputerWindow app="postam" title={m.inbox.app} bodyClassName="font-sans text-scene-ink">
          {children}
        </ComputerWindow>
      </ComputerDesktop>
    </Computer>
  );
}
