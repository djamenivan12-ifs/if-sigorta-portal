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
    <aside className="flex h-full min-h-0 w-full flex-col if-sidebar border-r border-white/10 bg-brand-navy text-white">
      {/* LOGO */}

      <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5 lg:px-5">
        <Logo tone="light" />
      </div>

      <div className="mx-4 shrink-0 border-t border-white/10" />

      {/* NAVIGATION */}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5 lg:px-4">
        <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/50 sm:mb-3 sm:text-[10px] sm:tracking-[0.18em]">
          {role === "admin" ? "Administration" : "Espace agent"}
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

      {/* FOOTER */}

      <div className="mx-4 shrink-0 border-t border-white/10" />

      <div className="shrink-0 p-3 sm:p-4 lg:p-5">
        <div className="rounded-xl bg-white/5 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
          <p className="text-xs font-semibold text-white">
            IF Sigorta
          </p>

          <p className="mt-0.5 text-[10px] leading-4 text-white/60 sm:mt-1 sm:text-[11px] sm:leading-5">
            Espace de gestion sécurisé
          </p>
        </div>

        <p className="mt-2 text-center text-[9px] text-white/50 sm:mt-3 sm:text-[10px] lg:mt-4">
          ©{" "}
          {new Date().getFullYear()}{" "}
          IF Sigorta
        </p>
      </div>
    </aside>
  );
}