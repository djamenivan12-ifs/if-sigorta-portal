import Link from "next/link";

type AdminNotificationsProps = {
  newRequests?: number;
  paymentsToReview: number;
  policiesToPrepare: number;
  blockedRequests: number;
};

export default function AdminNotifications({
  newRequests = 0,
  paymentsToReview,
  policiesToPrepare,
  blockedRequests,
}: AdminNotificationsProps) {
  const totalNotifications =
    newRequests +
    paymentsToReview +
    policiesToPrepare +
    blockedRequests;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
            Notifications
          </p>

          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
            Actions à traiter
          </h2>

          <p className="mt-1.5 text-[13px] leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
            Dossiers nécessitant une intervention.
          </p>
        </div>

        <div
          className={[
            "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2.5 text-[12px] font-black sm:h-10 sm:min-w-10 sm:px-3 sm:text-sm",
            totalNotifications > 0
              ? "bg-red-50 text-red-700"
              : "bg-[#F3F8F2] text-[#0B5D3B]",
          ].join(" ")}
        >
          {totalNotifications > 99
            ? "99+"
            : totalNotifications}
        </div>
      </div>

      <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
        <NotificationRow
          label="Nouvelles demandes"
          description="Nouvelles demandes d’assurance enregistrées."
          value={newRequests}
          href="/admin/notifications"
          type="new"
        />

        <NotificationRow
          label="Paiements à vérifier"
          description="Des dekonts attendent une validation."
          value={paymentsToReview}
          href="/admin/dossiers?status=payment_review"
          type="urgent"
        />

        <NotificationRow
          label="Polices à préparer"
          description="Des dossiers attendent la préparation de leur assurance."
          value={policiesToPrepare}
          href="/admin/dossiers?status=policy_preparation"
          type="normal"
        />

        <NotificationRow
          label="Dossiers bloqués"
          description="Paiements refusés ou dossiers annulés."
          value={blockedRequests}
          href="/admin/notifications"
          type="urgent"
        />
      </div>

      {totalNotifications === 0 ? (
        <div className="mt-4 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-2.5 text-[12px] font-semibold leading-5 text-[#0B5D3B] sm:mt-5 sm:px-4 sm:py-3 sm:text-sm">
          ✓ Aucune action urgente pour le moment.
        </div>
      ) : (
        <Link
          href="/admin/notifications"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-3 text-center text-[12px] font-bold leading-4 text-[#0B5D3B] transition hover:border-[#B7D4B8] hover:bg-[#EAF4E8] sm:mt-5 sm:min-h-11 sm:px-4 sm:text-sm"
        >
          Voir toutes les notifications →
        </Link>
      )}
    </section>
  );
}

type NotificationRowProps = {
  label: string;
  description: string;
  value: number;
  href: string;

  type:
    | "new"
    | "urgent"
    | "normal";
};

function NotificationRow({
  label,
  description,
  value,
  href,
  type,
}: NotificationRowProps) {
  let badgeClassName =
    "bg-slate-100 text-slate-600";

  if (
    value > 0 &&
    type === "urgent"
  ) {
    badgeClassName =
      "bg-red-50 text-red-700";
  }

  if (
    value > 0 &&
    type === "new"
  ) {
    badgeClassName =
      "bg-[#EAF4E8] text-[#0B5D3B]";
  }

  if (
    value > 0 &&
    type === "normal"
  ) {
    badgeClassName =
      "bg-amber-50 text-amber-700";
  }

  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-[#CFE3CF] hover:bg-[#FAFCFA] sm:gap-4 sm:p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-[13px] font-semibold leading-5 text-[#102B20] transition group-hover:text-[#0B5D3B] sm:text-base">
          {label}
        </p>

        <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-500 sm:mt-1 sm:text-sm sm:leading-5">
          {description}
        </p>
      </div>

      <span
        className={[
          "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold sm:h-9 sm:min-w-9 sm:px-3 sm:text-sm",
          badgeClassName,
        ].join(" ")}
      >
        {value > 99
          ? "99+"
          : value}
      </span>
    </Link>
  );
}