import Logo from "./Logo";
import Navigation from "./Navigation";

type SidebarProps = {
  role:
    | "admin"
    | "agent";

  urgentRenewalCount?:
    number;

  onNavigate?:
    () => void;
};

export default function Sidebar({
  role,
  urgentRenewalCount = 0,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200/80 bg-white">
      <div className="px-5 pb-4 pt-5">
        <Logo />
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Navigation
        </p>

        <Navigation
          role={role}
          urgentRenewalCount={
            urgentRenewalCount
          }
          onNavigate={
            onNavigate
          }
        />
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="p-5">
        <div className="rounded-2xl bg-[#F3F8F2] px-4 py-3">
          <p className="text-xs font-semibold text-[#31513B]">
            IF Sigorta
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Espace de gestion sécurisé
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          ©{" "}
          {new Date().getFullYear()}{" "}
          IF Sigorta
        </p>
      </div>
    </aside>
  );
}