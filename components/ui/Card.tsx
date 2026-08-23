import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function Card({
  children,
  title,
  description,
  action,
  className = "",
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:shadow-lg ${className}`}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-slate-900">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          {action}
        </div>
      )}

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}