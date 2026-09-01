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
    <aside className="flex h-full flex-col border-r border-slate-200/80 bg-white">
      <div className="px-5 pb-4 pt-5">
        <Logo />
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Espace partenaire
        </p>

        <PartnerNavigation
          onNavigate={onNavigate}
        />

        <div className="my-5 border-t border-slate-100" />

        <PartnerLogoutButton />
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="p-5">
        <div className="rounded-2xl bg-[#F3F8F2] px-4 py-3">
          <p className="truncate text-xs font-bold text-[#31513B]">
            {companyName}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {partnerCode}
          </p>

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Partenaire IF Sigorta
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} IF Sigorta
        </p>
      </div>
    </aside>
  );
}