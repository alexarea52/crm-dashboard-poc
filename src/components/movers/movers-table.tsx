import { SignalBadge } from "@/components/ui/badge";
import type { Mover } from "@/lib/types";

/** Compact table of recent movers: contact, destination, title, signal. */
export function MoversTable({ movers }: { movers: Mover[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          <th className="pb-2 font-medium">Contact</th>
          <th className="pb-2 font-medium">Moved to</th>
          <th className="pb-2 font-medium">New title</th>
          <th className="pb-2 text-right font-medium">Signal</th>
        </tr>
      </thead>
      <tbody>
        {movers.map((mover) => (
          <tr
            key={mover.id}
            className="border-t border-dashed border-zinc-200 dark:border-zinc-800"
          >
            <td className="py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
              {mover.name}
            </td>
            <td className="py-2.5 text-zinc-600 dark:text-zinc-300">
              {mover.toCompany}
            </td>
            <td className="py-2.5 text-zinc-600 dark:text-zinc-300">
              {mover.title}
            </td>
            <td className="py-2.5 text-right">
              <SignalBadge signal={mover.signal} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
