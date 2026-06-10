import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Column } from "@/lib/crm";

interface DataTableProps {
  /** Header definitions; each column's `align` also applies to its cells. */
  columns: Column[];
  /** Row-major cell data; each row must match `columns` in length/order. */
  rows: ReactNode[][];
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/** Bordered, dense data table matching the wireframe's deal/source grids. */
export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  "whitespace-nowrap border border-crm-table-border bg-crm-table-head px-3 py-2 font-semibold text-crm-primary",
                  alignClass[col.align ?? "left"],
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="even:bg-crm-row-alt">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    "whitespace-nowrap border border-crm-table-border px-3 py-1.5 text-zinc-700 tabular-nums",
                    alignClass[columns[c]?.align ?? "left"],
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
