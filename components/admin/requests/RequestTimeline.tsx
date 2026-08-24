type ActivityItem = {
  action: string;
  created_at: string;
  author?: string;
};

type RequestTimelineProps = {
  status: string;
  createdAt: string;

  paymentSubmittedAt?: string | null;
  paymentVerifiedAt?: string | null;

  activities: ActivityItem[];
};

type TimelineStepStatus =
  | "completed"
  | "current"
  | "pending"
  | "error";

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  date: string | null;
  author: string | null;
  status: TimelineStepStatus;
};

type DelayLevel =
  | "normal"
  | "watch"
  | "late"
  | "critical"
  | "completed"
  | "blocked";

type DelayInformation = {
  level: DelayLevel;
  label: string;
  description: string;
  className: string;
  dotClassName: string;
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

function formatDuration(
  startValue: string | null,
  endValue: string | null,
) {
  if (
    !startValue ||
    !endValue
  ) {
    return null;
  }

  const start =
    new Date(
      startValue,
    );

  const end =
    new Date(
      endValue,
    );

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return null;
  }

  const difference =
    end.getTime() -
    start.getTime();

  if (
    difference < 0
  ) {
    return null;
  }

  const totalMinutes =
    Math.floor(
      difference /
        60000,
    );

  if (
    totalMinutes <
    1
  ) {
    return "moins d’une minute";
  }

  if (
    totalMinutes <
    60
  ) {
    return `${totalMinutes} min`;
  }

  const totalHours =
    Math.floor(
      totalMinutes /
        60,
    );

  const remainingMinutes =
    totalMinutes %
    60;

  if (
    totalHours <
    24
  ) {
    if (
      remainingMinutes ===
      0
    ) {
      return `${totalHours} h`;
    }

    return `${totalHours} h ${remainingMinutes} min`;
  }

  const days =
    Math.floor(
      totalHours /
        24,
    );

  const remainingHours =
    totalHours %
    24;

  if (
    remainingHours ===
    0
  ) {
    return `${days} j`;
  }

  return `${days} j ${remainingHours} h`;
}

function getMinutesBetween(
  startValue: string,
  endValue: string,
) {
  const start =
    new Date(startValue);

  const end =
    new Date(endValue);

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return 0;
  }

  const difference =
    end.getTime() -
    start.getTime();

  if (difference <= 0) {
    return 0;
  }

  return (
    difference /
    (1000 * 60)
  );
}

function findActivity(
  activities: ActivityItem[],
  actions: string[],
) {
  return activities.find(
    (activity) =>
      actions.includes(
        activity.action,
      ),
  );
}

function getProgressValue(
  status: string,
  activities: ActivityItem[],
) {
  if (
    status ===
      "cancelled" ||
    status ===
      "payment_rejected"
  ) {
    return 40;
  }

  const whatsappSent =
    activities.some(
      (activity) =>
        activity.action ===
        "whatsapp_sent",
    );

  if (whatsappSent) {
    return 100;
  }

  switch (status) {
    case "draft":
      return 10;

    case "waiting_payment":
      return 20;

    case "payment_review":
      return 40;

    case "payment_confirmed":
      return 60;

    case "policy_preparation":
      return 70;

    case "policy_available":
      return 90;

    default:
      return 10;
  }
}

function getProgressLabel(
  progress: number,
) {
  if (
    progress >= 100
  ) {
    return "Terminé";
  }

  if (
    progress >= 90
  ) {
    return "Presque terminé";
  }

  if (
    progress >= 60
  ) {
    return "Traitement avancé";
  }

  if (
    progress >= 40
  ) {
    return "En cours";
  }

  return "Démarrage";
}

function getDelayInformation({
  status,
  lastActivityDate,
  completed,
}: {
  status: string;
  lastActivityDate: string;
  completed: boolean;
}): DelayInformation {
  if (completed) {
    return {
      level: "completed",

      label: "Traitement terminé",

      description:
        "Toutes les principales étapes du dossier sont terminées.",

      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",

      dotClassName:
        "bg-emerald-500",
    };
  }

  if (status === "cancelled") {
    return {
      level: "blocked",

      label: "Dossier annulé",

      description:
        "Le traitement de ce dossier a été interrompu.",

      className:
        "border-slate-300 bg-slate-100 text-slate-700",

      dotClassName:
        "bg-slate-500",
    };
  }

  if (status === "payment_rejected") {
    return {
      level: "blocked",

      label: "Action requise",

      description:
        "Le paiement a été refusé. Une intervention est nécessaire.",

      className:
        "border-red-200 bg-red-50 text-red-700",

      dotClassName:
        "bg-red-500",
    };
  }

  const now =
    new Date().toISOString();

  const minutesWithoutAction =
    getMinutesBetween(
      lastActivityDate,
      now,
    );

  if (minutesWithoutAction >= 30) {
    return {
      level: "critical",

      label: "Priorité élevée",

      description:
        `Aucune progression depuis ${formatDuration(
          lastActivityDate,
          now,
        )}. Une intervention rapide est recommandée.`,

      className:
        "border-red-200 bg-red-50 text-red-700",

      dotClassName:
        "bg-red-500",
    };
  }

  if (minutesWithoutAction >= 15) {
    return {
      level: "late",

      label: "En retard",

      description:
        `Aucune progression depuis ${formatDuration(
          lastActivityDate,
          now,
        )}.`,

      className:
        "border-orange-200 bg-orange-50 text-orange-700",

      dotClassName:
        "bg-orange-500",
    };
  }

  if (minutesWithoutAction >= 5) {
    return {
      level: "watch",

      label: "À surveiller",

      description:
        `Aucune progression depuis ${formatDuration(
          lastActivityDate,
          now,
        )}.`,

      className:
        "border-amber-200 bg-amber-50 text-amber-700",

      dotClassName:
        "bg-amber-500",
    };
  }

  return {
    level: "normal",

    label: "Traitement normal",

    description:
      "Aucun retard détecté pour le moment.",

    className:
      "border-green-200 bg-green-50 text-green-700",

    dotClassName:
      "bg-green-500",
  };
}

export default function RequestTimeline({
  status,
  createdAt,
  paymentSubmittedAt,
  paymentVerifiedAt,
  activities,
}: RequestTimelineProps) {
  const paymentUploaded =
    findActivity(
      activities,
      [
        "payment_uploaded",
      ],
    );

  const paymentConfirmed =
    findActivity(
      activities,
      [
        "payment_confirmed",
      ],
    );

  const preparationStarted =
    findActivity(
      activities,
      [
        "policy_preparation_started",
      ],
    );

  const policyUploaded =
    findActivity(
      activities,
      [
        "policy_uploaded_year_1",
        "policy_uploaded_year_2",
        "policy_replaced_year_1",
        "policy_replaced_year_2",
      ],
    );

  const whatsappSent =
    findActivity(
      activities,
      [
        "whatsapp_sent",
      ],
    );

  const paymentRejected =
    findActivity(
      activities,
      [
        "payment_rejected",
      ],
    );

  const cancelled =
    findActivity(
      activities,
      [
        "request_cancelled",
      ],
    );

  const paymentReceivedDate =
    paymentSubmittedAt ??
    paymentUploaded
      ?.created_at ??
    null;

  const paymentConfirmedDate =
    paymentVerifiedAt ??
    paymentConfirmed
      ?.created_at ??
    null;

  const preparationDate =
    preparationStarted
      ?.created_at ??
    null;

  const policyAvailableDate =
    policyUploaded
      ?.created_at ??
    null;

  const whatsappDate =
    whatsappSent
      ?.created_at ??
    null;

  const steps:
    TimelineStep[] = [
    {
      key:
        "created",

      label:
        "Demande créée",

      description:
        "Le dossier d’assurance a été enregistré.",

      date:
        createdAt,

      author:
        "Client",

      status:
        "completed",
    },

    {
      key:
        "payment",

      label:
        "Paiement reçu",

      description:
        "Le client a transmis son justificatif de paiement.",

      date:
        paymentReceivedDate,

      author:
        paymentUploaded
          ?.author ??
        null,

      status:
        paymentReceivedDate
          ? "completed"
          : status ===
              "waiting_payment"
            ? "current"
            : "pending",
    },

    {
      key:
        "payment-confirmed",

      label:
        "Paiement validé",

      description:
        paymentRejected
          ? "Le paiement a été refusé."
          : "Le paiement a été vérifié et confirmé.",

      date:
        paymentRejected
          ?.created_at ??
        paymentConfirmedDate,

      author:
        paymentRejected
          ?.author ??
        paymentConfirmed
          ?.author ??
        null,

      status:
        paymentRejected ||
        status ===
          "payment_rejected"
          ? "error"
          : paymentConfirmedDate
            ? "completed"
            : status ===
                "payment_review"
              ? "current"
              : "pending",
    },

    {
      key:
        "preparation",

      label:
        "Assurance en préparation",

      description:
        "L’agent prépare la police d’assurance du client.",

      date:
        preparationDate,

      author:
        preparationStarted
          ?.author ??
        null,

      status:
        preparationDate ||
        status ===
          "policy_available"
          ? "completed"
          : status ===
              "policy_preparation"
            ? "current"
            : "pending",
    },

    {
      key:
        "policy",

      label:
        "Assurance disponible",

      description:
        "La police d’assurance a été déposée dans le dossier.",

      date:
        policyAvailableDate,

      author:
        policyUploaded
          ?.author ??
        null,

      status:
        policyAvailableDate ||
        status ===
          "policy_available"
          ? "completed"
          : "pending",
    },

    {
      key:
        "whatsapp",

      label:
        "Client notifié",

      description:
        "Le client a été informé sur WhatsApp que son assurance est disponible.",

      date:
        whatsappDate,

      author:
        whatsappSent
          ?.author ??
        null,

      status:
        whatsappDate
          ? "completed"
          : status ===
              "policy_available"
            ? "current"
            : "pending",
    },
  ];

  const progress =
    getProgressValue(
      status,
      activities,
    );

  const isCancelled =
    Boolean(
      cancelled ||
      status ===
        "cancelled",
    );

  const isCompleted =
    Boolean(
      whatsappDate,
    );

  /*
   * Cherche la dernière vraie
   * progression connue du dossier.
   */
  const progressionDates = [
    createdAt,
    paymentReceivedDate,
    paymentConfirmedDate,
    preparationDate,
    policyAvailableDate,
    whatsappDate,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );

  const lastProgressDate =
    progressionDates
      .map(
        (
          value,
        ) =>
          new Date(
            value,
          ),
      )
      .filter(
        (
          date,
        ) =>
          !Number.isNaN(
            date.getTime(),
          ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.getTime() -
          first.getTime(),
      )[0]
      ?.toISOString() ??
    createdAt;

  const delayInformation =
    getDelayInformation({
      status,
      lastActivityDate:
        lastProgressDate,
      completed:
        isCompleted,
    });

  const totalProcessingTime =
    whatsappDate
      ? formatDuration(
          createdAt,
          whatsappDate,
        )
      : formatDuration(
          createdAt,
          new Date().toISOString(),
        );

  const currentWaitingTime =
    !isCompleted
      ? formatDuration(
          lastProgressDate,
          new Date().toISOString(),
        )
      : null;

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Progression
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
            Progression du dossier
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Suivez l’avancement et détectez automatiquement les dossiers nécessitant une attention particulière.
          </p>
        </div>

        <div className="shrink-0 lg:text-right">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0B5D3B]">
            {progress} %
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {getProgressLabel(
              progress,
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              isCancelled
                ? "bg-slate-500"
                : status ===
                    "payment_rejected"
                  ? "bg-red-500"
                  : "bg-[#0B5D3B]"
            }`}
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            0 %
          </span>

          <span>
            100 %
          </span>
        </div>
      </div>

      {/* État du délai */}
      <div
        className={`mt-6 rounded-xl border p-4 ${delayInformation.className}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${delayInformation.dotClassName}`}
          />

          <div>
            <p className="font-semibold">
              {
                delayInformation.label
              }
            </p>

            <p className="mt-1 text-sm leading-6 opacity-90">
              {
                delayInformation.description
              }
            </p>
          </div>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#F3F8F2] px-4 py-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0B5D3B]">
            Temps total
          </p>

          <p className="mt-1 text-lg font-semibold text-[#102B20]">
            {totalProcessingTime ??
              "—"}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isCompleted
              ? "Durée totale jusqu’à la notification du client."
              : "Temps écoulé depuis la création du dossier."}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sans progression
          </p>

          <p className="mt-1 text-lg font-semibold text-[#102B20]">
            {isCompleted
              ? "Terminé"
              : currentWaitingTime ??
                "—"}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Temps depuis la dernière étape importante.
          </p>
        </div>
      </div>

      {/* Annulation */}
      {isCancelled && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Ce dossier a été annulé.

          {cancelled?.created_at
            ? ` ${formatDate(
                cancelled.created_at,
              )}`
            : ""}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-8">
        {steps.map(
          (
            step,
            index,
          ) => {
            const isLast =
              index ===
              steps.length - 1;

            const previousStep =
              index > 0
                ? steps[
                    index -
                      1
                  ]
                : null;

            const durationFromPrevious =
              previousStep
                ?.date &&
              step.date
                ? formatDuration(
                    previousStep.date,
                    step.date,
                  )
                : null;

            return (
              <div
                key={
                  step.key
                }
                className="relative flex gap-4"
              >
                {/* Indicateur */}
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <TimelineDot
                    status={
                      step.status
                    }
                  />

                  {!isLast && (
                    <div
                      className={`min-h-24 w-0.5 flex-1 ${
                        step.status ===
                          "completed"
                          ? "bg-[#A8D8B5]"
                          : step.status ===
                              "error"
                            ? "bg-red-200"
                            : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>

                {/* Informations */}
                <div
                  className={`min-w-0 flex-1 ${
                    !isLast
                      ? "pb-8"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {
                            step.label
                          }
                        </h3>

                        <TimelineBadge
                          status={
                            step.status
                          }
                        />
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {
                          step.description
                        }
                      </p>
                    </div>

                    {step.date && (
                      <p className="shrink-0 text-xs font-medium text-slate-400">
                        {formatDate(
                          step.date,
                        )}
                      </p>
                    )}
                  </div>

                  {durationFromPrevious && (
                    <div className="mt-3 inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      +{" "}
                      {
                        durationFromPrevious
                      }{" "}
                      depuis l’étape précédente
                    </div>
                  )}

                  {step.author && (
                    <p className="mt-3 text-xs text-slate-500">
                      Par{" "}
                      <span className="font-semibold text-slate-700">
                        {
                          step.author
                        }
                      </span>
                    </p>
                  )}

                  {!step.date &&
                    step.status ===
                      "pending" && (
                      <p className="mt-3 text-xs font-medium text-slate-400">
                        En attente
                      </p>
                    )}

                  {step.status ===
                    "current" &&
                    currentWaitingTime && (
                    <p className="mt-3 text-xs font-semibold text-amber-600">
                      Étape en cours depuis{" "}
                      {
                        currentWaitingTime
                      }
                    </p>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}

function TimelineDot({
  status,
}: {
  status:
    TimelineStepStatus;
}) {
  const styles = {
    completed:
      "border-[#0B5D3B] bg-[#0B5D3B] text-white",

    current:
      "border-amber-500 bg-amber-100 text-amber-700",

    pending:
      "border-slate-300 bg-white text-slate-300",

    error:
      "border-red-500 bg-red-500 text-white",
  };

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${styles[status]}`}
    >
      {status ===
      "completed"
        ? "✓"
        : status ===
            "current"
          ? "•"
          : status ===
              "error"
            ? "!"
            : ""}
    </div>
  );
}

function TimelineBadge({
  status,
}: {
  status:
    TimelineStepStatus;
}) {
  const config = {
    completed: {
      label:
        "Terminé",

      className:
        "bg-[#EEF6EC] text-[#0B5D3B]",
    },

    current: {
      label:
        "En cours",

      className:
        "bg-amber-100 text-amber-700",
    },

    pending: {
      label:
        "À venir",

      className:
        "bg-slate-100 text-slate-500",
    },

    error: {
      label:
        "Problème",

      className:
        "bg-red-100 text-red-700",
    },
  };

  const item =
    config[
      status
    ];

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.className}`}
    >
      {item.label}
    </span>
  );
}