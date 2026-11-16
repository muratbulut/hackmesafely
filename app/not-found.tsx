import type { Metadata } from "next";
import { PageBackground } from "@/components/background/PageBackground";
import { NotFoundContent } from "@/components/status/NotFoundContent";
import { VisitorShell } from "@/components/visitor/VisitorShell";
import { getMessages } from "@/lib/i18n";

export const metadata: Metadata = { title: getMessages().pages.notFound };

/** Adresi olmayan sayfa ve kabuğu kendinden olmayan yerlerdeki notFound(): ziyaretçi kabuğuyla 404. */
export default function NotFound() {
  return (
    <VisitorShell background={<PageBackground />}>
      <NotFoundContent />
    </VisitorShell>
  );
}
