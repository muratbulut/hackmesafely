import type { CardIcon } from "@/lib/lab/content";
import { getMessages } from "@/lib/i18n";
import { cardIconMap } from "./card-icons";

type Permission = { app: string; text: string; icon: CardIcon };

/**
 * Mini testin üstündeki izin penceresi (Şehir Kapısı, Dosya ve uygulama): uygulama telefonun bir
 * parçasına ulaşmak istediğinde çıkan pencere. Pencere hafifçe büyüyerek açılır ("Hareketi azalt"
 * açıksa yerinde durur). Düğmeler yalnızca çizimdir; öğrenci cevabını aşağıdaki şıklardan seçer.
 */
export function PermissionPeek({ permission }: { permission: Permission }) {
  const m = getMessages().lab.training.quiz.permission;
  const Icon = cardIconMap[permission.icon];
  return (
    <div
      data-testid="permission-peek"
      className="flex justify-center overflow-hidden rounded-[20px] border border-card bg-[linear-gradient(180deg,color-mix(in_srgb,var(--scene-scrim)_70%,transparent),var(--surface-deep))] px-4 py-4"
    >
      <div className="w-full max-w-[320px] rounded-[22px] bg-scene-white px-4 pt-4 pb-1.5 font-sans text-scene-ink shadow-floating motion-safe:[animation:perm-pop_.45s_.3s_ease-out_both]">
        <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-scene-blue/15 text-scene-blue">
          <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <p className="mt-2 text-center text-[15px] leading-snug">
          <b>{permission.app}</b> {permission.text}
        </p>
        <span aria-hidden="true" className="mt-3 flex flex-col divide-y divide-scene-line border-t border-scene-line text-center text-[14px] font-bold text-scene-blue">
          <span className="py-2">{m.allow}</span>
          <span className="py-2">{m.once}</span>
          <span className="py-2">{m.deny}</span>
        </span>
      </div>
    </div>
  );
}
