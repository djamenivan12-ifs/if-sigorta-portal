import Logo from "@/components/admin/layout/Logo";

import PartnerLogoutButton from "./PartnerLogoutButton";
import PartnerNavigation from "./PartnerNavigation";

type PartnerSidebarProps = {
  companyName: string;
  partnerCode: string;
  onNavigate?: () => void;
};

export default function PartnerSidebar({
  companyName,
  partnerCode,
  onNavigate,
}: PartnerSidebarProps) {
  return (
    <aside className="flex h-full flex-col if-sidebar border-r border-white/10 bg-brand-navy text-white">
      <div className="px-5 pb-4 pt-5">
        <Logo tone="light" href="/partenaire/tableau-de-bord" label="IF Sigorta - Espace partenaire" />
      </div>

      <div className="mx-4 border-t border-white/10" />

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
          Espace partenaire
        </p>

        <PartnerNavigation
          onNavigate={onNavigate}
        />

        <div className="my-5 border-t border-white/10" />

        <PartnerLogoutButton />
      </div>

      <div className="mx-4 border-t border-white/10" />

      <div className="p-5">
        <div className="rounded-2xl bg-white/5 px-4 py-3">
          <p className="truncate text-xs font-bold text-white">
            {companyName}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-white/60">
            {partnerCode}
          </p>

          <p className="mt-2 text-[11px] leading-5 text-white/60">
            Partenaire IF Sigorta
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/50">
          © {new Date().getFullYear()} IF Sigorta
        </p>
      </div>
    </aside>
  );
}