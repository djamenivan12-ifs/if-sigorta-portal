import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type InputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(function Input(
  {
    label,
    description,
    error,
    leftIcon,
    rightIcon,
    id,
    className = "",
    disabled,
    ...inputProps
  },
  ref,
) {
  const inputId =
    id || inputProps.name;

  const descriptionId =
    description && inputId
      ? `${inputId}-description`
      : undefined;

  const errorId =
    error && inputId
      ? `${inputId}-error`
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
          htmlFor={inputId}
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          {label}

          {inputProps.required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={
            error ? "true" : "false"
          }
          aria-describedby={
            describedBy || undefined
          }
          className={[
            "min-h-11 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400",
            "focus:ring-4",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            leftIcon ? "pl-11" : "",
            rightIcon ? "pr-11" : "",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...inputProps}
        />

        {rightIcon && (
          <span className="absolute right-4 top-1/2 flex -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        )}
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

export default Input;