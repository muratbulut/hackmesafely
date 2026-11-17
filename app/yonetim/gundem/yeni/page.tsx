import { Suspense } from "react";
import { ArticleEditor } from "@/components/admin/news/ArticleEditor";
import { Loading } from "@/components/status/Loading";
import { requirePermission } from "@/lib/admin/access";
import { adminMetadata } from "@/lib/admin/metadata";
import { getMessages } from "@/lib/i18n";
import { getEditorOptions } from "@/lib/news/data";

export function generateMetadata() {
  return adminMetadata(() => getMessages().news.admin.newArticle, "NEWS");
}

/**
 * Yeni haber (Gundem-Son "Yeni haber"): boş düzenleyici; ilk "Taslak kaydet" ya da "Planla" haberi
 * açar. Takvim şeridindeki boş Cumadan gelinirse (`?hafta=`) o hafta seçili gelir; hafta
 * önümüzdeki Cumalardan biri değilse ya da doluysa yok sayılır.
 */
export default function NewArticlePage({ searchParams }: PageProps<"/yonetim/gundem/yeni">) {
  return (
    <Suspense fallback={<Loading className="m-4 lg:m-9" />}>
      <NewArticle searchParams={searchParams} />
    </Suspense>
  );
}

async function NewArticle({ searchParams }: Pick<PageProps<"/yonetim/gundem/yeni">, "searchParams">) {
  await requirePermission("NEWS");
  const [params, options] = await Promise.all([searchParams, getEditorOptions()]);
  const week = options.weeks.find((w) => w.key === params.hafta && !w.takenBy)?.key ?? null;
  return <ArticleEditor article={null} options={options} initialWeek={week} />;
}
