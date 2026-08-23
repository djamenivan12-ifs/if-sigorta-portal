import {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

const variantClassNames: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:ring-blue-200",

  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-200",

  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-200",

  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-200",

  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-200",
};

const sizeClassNames: Record<
  ButtonSize,
  string
> = {
  sm: "min-h-9 rounded-lg px-3 py-2 text-sm",
  md: "min-h-11 rounded-xl px-4 py-2.5 text-sm",
  lg: "min-h-12 rounded-xl px-5 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  type = "button",
  ...buttonProps
}: ButtonProps) {
  const isDisabled =
    disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold transition",
        "outline-none focus-visible:ring-4",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClassNames[variant],
        sizeClassNames[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...buttonProps}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}

      <span>
        {loading
          ? "Chargement..."
          : children}
      </span>

      {!loading && rightIcon}
    </button>
  );
}