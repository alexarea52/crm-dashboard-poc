"use client";

import { SignalBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { Mover } from "@/lib/types";

function ActionQueueItem({
  mover,
  onEmail,
  onSnooze,
}: {
  mover: Mover;
  onEmail?: (mover: Mover) => void;
  onSnooze?: (mover: Mover) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {mover.name}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            Moved to{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {mover.toCompany}
            </span>{" "}
            · {mover.title}
          </p>
        </div>
        <SignalBadge signal={mover.signal} />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onEmail?.(mover)}>
          Email →
        </Button>
        <Button variant="ghost" onClick={() => onSnooze?.(mover)}>
          Snooze
        </Button>
      </div>
    </div>
  );
}

interface ActionQueueProps {
  movers: Mover[];
  title?: string;
  subtitle?: string;
  onEmail?: (mover: Mover) => void;
  onSnooze?: (mover: Mover) => void;
}

/** Right-rail queue of movers worth a touch today. */
export function ActionQueue({
  movers,
  title = "Action queue",
  subtitle = "Warm movers worth a touch today",
  onEmail,
  onSnooze,
}: ActionQueueProps) {
  return (
    <Card>
      <CardHeader title={`⚡ ${title}`} subtitle={subtitle} />
      <div className="flex flex-col gap-2.5 p-4 pt-3">
        {movers.map((mover) => (
          <ActionQueueItem
            key={mover.id}
            mover={mover}
            onEmail={onEmail}
            onSnooze={onSnooze}
          />
        ))}
      </div>
    </Card>
  );
}
