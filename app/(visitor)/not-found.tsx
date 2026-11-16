import type { Metadata } from "next";
import { PageBackground } from "@/components/background/PageBackground";
import { NotFoundContent } from "@/components/status/NotFoundContent";
import { getMessages } from "@/lib/i18n";

export const metadata: Metadata = { title: getMessages().pages.notFound };

/**
 * (visitor) içindeki notFound() (başka öğretmenin sınıfı, sorumlu olmayana Okulum, olmayan haber
 * ya da mahalle): kabuk (visitor) yerleşiminden gelir, burada yalnızca 404'ün gövdesi.
 */
export default function VisitorNotFound() {
  return (
    <>
      <PageBackground />
      <NotFoundContent />
    </>
  );
}
