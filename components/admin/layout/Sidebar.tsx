import Logo from "./Logo";
import Navigation from "./Navigation";

type SidebarProps = {
  role:
    | "admin"
    | "agent";

  urgentRenewalCount?: number;
};

export default function Sidebar({
  role,
  urgentRenewalCount = 0,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-5">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <Navigation
          role={role}
          urgentRenewalCount={
            urgentRenewalCount
          }
        />
      </div>

      <div className="border-t border-slate-100 p-5">
        <p className="text-center text-xs text-slate-400">
          ©{" "}
          {new Date().getFullYear()}{" "}
          IF Sigorta
        </p>
      </div>
    </aside>
  );
}