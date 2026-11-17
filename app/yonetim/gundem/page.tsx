import { Suspense } from "react";
import { NewsAdminList } from "@/components/admin/news/NewsAdminList";
import { tabFromParam } from "@/components/admin/news/shared";
import { Loading } from "@/components/status/Loading";
import { requirePermission } from "@/lib/admin/access";
import { adminMetadata } from "@/lib/admin/metadata";
import { getMessages } from "@/lib/i18n";
import { getAdminArticles, getNewsCalendar } from "@/lib/news/data";

export function generateMetadata() {
  return adminMetadata(() => getMessages().admin.menu.news, "NEWS");
}

/** Yönetim · Gündem (Gundem-Son, E1): önümüzdeki 6 Cuma şeridi, Yayında / Planlı / Taslak listesi ve yeni haber. */
export default function AdminNewsPage({ searchParams }: PageProps<"/yonetim/gundem">) {
  return (
    <Suspense fallback={<Loading className="m-4 lg:m-9" />}>
      <AdminNews searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminNews({ searchParams }: Pick<PageProps<"/yonetim/gundem">, "searchParams">) {
  await requirePermission("NEWS");
  const [params, rows, weeks] = await Promise.all([searchParams, getAdminArticles(), getNewsCalendar()]);
  return <NewsAdminList rows={rows} weeks={weeks} initialTab={tabFromParam(params.sekme)} />;
}
