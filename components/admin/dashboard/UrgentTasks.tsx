import Link from "next/link";
import {
  AlertCircle,
  FileClock,
  ReceiptText,
} from "lucide-react";

type UrgentTask = {
  label: string;
  value: number;
  href: string;
  description: string;
  icon: "payment" | "policy" | "blocked";
};

type UrgentTasksProps = {
  tasks?: UrgentTask[];
};

const defaultTasks: UrgentTask[] = [
  {
    label: "Paiements à vérifier",
    value: 5,
    href: "/admin/dossiers",
    description:
      "Des dekonts attendent une validation.",
    icon: "payment",
  },
  {
    label: "Polices à préparer",
    value: 8,
    href: "/admin/dossiers",
    description:
      "Des dossiers sont prêts pour la préparation.",
    icon: "policy",
  },
  {
    label: "Dossiers bloqués",
    value: 2,
    href: "/admin/dossiers",
    description:
      "Une intervention manuelle est nécessaire.",
    icon: "blocked",
  },
];

export default function UrgentTasks({
  tasks = defaultTasks,
}: UrgentTasksProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Priorités
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Tâches urgentes
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Les éléments qui nécessitent une action rapide.
          </p>
        </div>

        <span className="inline-flex min-h-8 items-center rounded-full bg-red-50 px-3 text-xs font-semibold text-red-700">
          Action requise
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.label}
            task={task}
          />
        ))}
      </div>
    </section>
  );
}

type TaskItemProps = {
  task: UrgentTask;
};

function TaskItem({
  task,
}: TaskItemProps) {
  const style =
    task.icon === "payment"
      ? {
          container:
            "border-amber-200 bg-amber-50 hover:border-amber-300",
          icon:
            "bg-amber-100 text-amber-700",
          value:
            "text-amber-800",
        }
      : task.icon === "policy"
        ? {
            container:
              "border-blue-200 bg-blue-50 hover:border-blue-300",
            icon:
              "bg-blue-100 text-blue-700",
            value:
              "text-blue-800",
          }
        : {
            container:
              "border-red-200 bg-red-50 hover:border-red-300",
            icon:
              "bg-red-100 text-red-700",
            value:
              "text-red-800",
          };

  return (
    <Link
      href={task.href}
      className={[
        "group flex items-center gap-4 rounded-2xl border p-4 transition",
        style.container,
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          style.icon,
        ].join(" ")}
      >
        {task.icon === "payment" && (
          <ReceiptText className="h-5 w-5" />
        )}

        {task.icon === "policy" && (
          <FileClock className="h-5 w-5" />
        )}

        {task.icon === "blocked" && (
          <AlertCircle className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-slate-900">
            {task.label}
          </p>

          <span
            className={[
              "text-2xl font-bold",
              style.value,
            ].join(" ")}
          >
            {task.value}
          </span>
        </div>

        <p className="mt-1 text-sm leading-5 text-slate-600">
          {task.description}
        </p>

        <p className="mt-2 text-xs font-semibold text-slate-500 transition group-hover:text-slate-700">
          Ouvrir la liste →
        </p>
      </div>
    </Link>
  );
}