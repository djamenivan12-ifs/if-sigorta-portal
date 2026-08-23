import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import StickyHorizontalScroll from "@/components/admin/layout/StickyHorizontalScroll";

type TableProps =
  TableHTMLAttributes<HTMLTableElement> & {
    children: ReactNode;
  };

type TableSectionProps =
  HTMLAttributes<HTMLTableSectionElement> & {
    children: ReactNode;
  };

type TableRowProps =
  HTMLAttributes<HTMLTableRowElement> & {
    children: ReactNode;
  };

type TableHeadCellProps =
  ThHTMLAttributes<HTMLTableCellElement> & {
    children: ReactNode;
  };

type TableCellProps =
  TdHTMLAttributes<HTMLTableCellElement> & {
    children: ReactNode;
  };

type TableContainerProps = {
  children: ReactNode;
  className?: string;
};

export function TableContainer({
  children,
  className = "",
}: TableContainerProps) {
  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StickyHorizontalScroll>
        {children}
      </StickyHorizontalScroll>
    </div>
  );
}

export function Table({
  children,
  className = "",
  ...tableProps
}: TableProps) {
  return (
    <table
      className={[
        "min-w-full border-collapse text-left text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...tableProps}
    >
      {children}
    </table>
  );
}

export function TableHeader({
  children,
  className = "",
  ...sectionProps
}: TableSectionProps) {
  return (
    <thead
      className={[
        "border-b border-slate-200 bg-slate-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...sectionProps}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
  ...sectionProps
}: TableSectionProps) {
  return (
    <tbody
      className={[
        "divide-y divide-slate-100 bg-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...sectionProps}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = "",
  ...rowProps
}: TableRowProps) {
  return (
    <tr
      className={[
        "transition hover:bg-slate-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rowProps}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = "",
  ...headProps
}: TableHeadCellProps) {
  return (
    <th
      className={[
        "whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...headProps}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
  ...cellProps
}: TableCellProps) {
  return (
    <td
      className={[
        "px-5 py-4 align-middle text-slate-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...cellProps}
    >
      {children}
    </td>
  );
}