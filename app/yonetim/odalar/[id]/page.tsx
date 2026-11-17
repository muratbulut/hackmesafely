import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoomPage } from "@/components/admin/labs/RoomPage";
import { Loading } from "@/components/status/Loading";
import { checklistFor } from "@/lib/admin/compare";
import { requireLabAccess } from "@/lib/admin/access";
import { getAdminLab, getAdminLabList } from "@/lib/admin/lab-data";
import { adminMetadata } from "@/lib/admin/metadata";

export function generateMetadata({ params }: PageProps<"/yonetim/odalar/[id]">) {
  return adminMetadata(async () => {
    const { id } = await params;
    const lab = await getAdminLab(id);
    return lab ? lab.draft.meta.name || lab.slug : null;
  }, "LAB_EDITING", "LAB_PUBLISHING");
}

/**
 * Odanın salt okunur sayfası (39, 17 Kasım, Murat): sayılar, "Öğrenci gibi dene", yayınla / gizle ve
 * odanın depodaki dosyası. İçerik burada yazılmaz; oda dosyada yazılır, yayınla birlikte gelir.
 */
export default function LabRoomPage({ params }: PageProps<"/yonetim/odalar/[id]">) {
  return (
    <Suspense fallback={<Loading className="m-4 lg:m-9" />}>
      <RoomLoader params={params} />
    </Suspense>
  );
}

async function RoomLoader({ params }: Pick<PageProps<"/yonetim/odalar/[id]">, "params">) {
  const access = await requireLabAccess();
  const { id } = await params;
  const [lab, neighborhoods] = await Promise.all([getAdminLab(id), getAdminLabList()]);
  const neighborhood = neighborhoods.find((n) => n.labs.some((r) => r.id === id));
  const row = neighborhood?.labs.find((r) => r.id === id);
  if (!lab || !neighborhood || !row) notFound();
  // Taslak okunamıyorsa eksik listesi gösterilmez (yerine "Taslak okunamadı" uyarısı çıkar).
  const missing = row.status === "DRAFT" && !row.ready && !lab.draftIssues ? checklistFor(lab.template, lab.draft).filter((c) => !c.ok).map((c) => c.key) : [];
  return (
    <RoomPage
      row={row}
      neighborhood={neighborhood}
      sourceFile={lab.sourceFile}
      draftIssues={lab.draftIssues}
      missing={missing}
      canPublish={access.canPublish}
    />
  );
}
