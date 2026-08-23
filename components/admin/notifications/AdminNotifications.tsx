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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
            Notifications
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Actions à traiter
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Dossiers nécessitant une intervention.
          </p>
        </div>

        <div
          className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold ${
            totalNotifications >
            0
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {totalNotifications >
          99
            ? "99+"
            : totalNotifications}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <NotificationRow
          label="Nouvelles demandes"
          description="Nouvelles demandes d’assurance enregistrées."
          value={
            newRequests
          }
          href="/admin/notifications"
          type="new"
        />

        <NotificationRow
          label="Paiements à vérifier"
          description="Des dekonts attendent une validation."
          value={
            paymentsToReview
          }
          href="/admin/dossiers?status=payment_review"
          type="urgent"
        />

        <NotificationRow
          label="Polices à préparer"
          description="Des dossiers attendent la préparation de leur assurance."
          value={
            policiesToPrepare
          }
          href="/admin/dossiers?status=policy_preparation"
          type="normal"
        />

        <NotificationRow
          label="Dossiers bloqués"
          description="Paiements refusés ou dossiers annulés."
          value={
            blockedRequests
          }
          href="/admin/notifications"
          type="urgent"
        />
      </div>

      {totalNotifications ===
      0 ? (
        <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ Aucune action urgente pour le moment.
        </div>
      ) : (
        <Link
          href="/admin/notifications"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#2F2963]/20 bg-[#2F2963]/5 px-4 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/10"
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
      "bg-red-100 text-red-700";
  }

  if (
    value > 0 &&
    type === "new"
  ) {
    badgeClassName =
      "bg-blue-100 text-blue-700";
  }

  if (
    value > 0 &&
    type === "normal"
  ) {
    badgeClassName =
      "bg-amber-100 text-amber-700";
  }

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-[#2F2963]/30 hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">
          {label}
        </p>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <span
        className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-3 text-sm font-bold ${badgeClassName}`}
      >
        {value >
        99
          ? "99+"
          : value}
      </span>
    </Link>
  );
}