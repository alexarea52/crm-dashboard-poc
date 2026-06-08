"use client";

import { Avatar } from "@/components/ui/avatar";
import { SignalBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Mover } from "@/lib/types";

interface MoverCardProps {
  mover: Mover;
  onReachOut?: (mover: Mover) => void;
  onView?: (mover: Mover) => void;
}

/** Person card: avatar, name/title, the move, signal, and quick actions. */
export function MoverCard({ mover, onReachOut, onView }: MoverCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={mover.name} initials={mover.initials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {mover.name}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {mover.title}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        Moved from{" "}
        {mover.fromCompany ? (
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {mover.fromCompany}
          </span>
        ) : null}{" "}
        <span aria-hidden>→</span>{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {mover.toCompany}
        </span>{" "}
        <SignalBadge signal={mover.signal} />
      </p>

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onReachOut?.(mover)}>
          Reach out
        </Button>
        <Button variant="secondary" onClick={() => onView?.(mover)}>
          View
        </Button>
      </div>
    </Card>
  );
}
