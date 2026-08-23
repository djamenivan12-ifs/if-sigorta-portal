import type { ReactNode } from "react";

type BadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

type BadgeSize =
  | "sm"
  | "md";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
};

const variantClassNames: Record<
  BadgeVariant,
  string
> = {
  neutral:
    "border-slate-200 bg-slate-100 text-slate-700",

  info:
    "border-blue-200 bg-blue-50 text-blue-700",

  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  warning:
    "border-amber-200 bg-amber-50 text-amber-700",

  danger:
    "border-red-200 bg-red-50 text-red-700",
};

const dotClassNames: Record<
  BadgeVariant,
  string
> = {
  neutral:
    "bg-slate-500",

  info:
    "bg-blue-500",

  success:
    "bg-emerald-500",

  warning:
    "bg-amber-500",

  danger:
    "bg-red-500",
};

const sizeClassNames: Record<
  BadgeSize,
  string
> = {
  sm: "min-h-6 px-2.5 py-1 text-xs",
  md: "min-h-7 px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-2 rounded-full border font-semibold",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          className={[
            "h-2 w-2 rounded-full",
            dotClassNames[variant],
          ].join(" ")}
          aria-hidden="true"
        />
      )}

      {children}
    </span>
  );
}