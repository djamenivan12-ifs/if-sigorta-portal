import {
  forwardRef,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    description?: string;
    error?: string;
    leftIcon?: ReactNode;
  };

const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    label,
    description,
    error,
    leftIcon,
    id,
    className = "",
    disabled,
    children,
    ...selectProps
  },
  ref,
) {
  const selectId =
    id || selectProps.name;

  const descriptionId =
    description && selectId
      ? `${selectId}-description`
      : undefined;

  const errorId =
    error && selectId
      ? `${selectId}-error`
      : undefined;

  const describedBy = [
    descriptionId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          {label}

          {selectProps.required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 flex -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={
            error ? "true" : "false"
          }
          aria-describedby={
            describedBy || undefined
          }
          className={[
            "min-h-11 w-full appearance-none rounded-xl border bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition",
            "focus:ring-4",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            leftIcon ? "pl-11" : "",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...selectProps}
        >
          {children}
        </select>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <path d="m7 10 5 5 5-5" />
        </svg>
      </div>

      {description && !error && (
        <p
          id={descriptionId}
          className="mt-2 text-xs leading-5 text-slate-500"
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="mt-2 text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;