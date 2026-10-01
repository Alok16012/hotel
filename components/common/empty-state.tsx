import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty states carry information, not apology.
 *
 * In an operations product an empty queue is usually good news — it means the
 * automation cleared it. So the default tone is declarative ("Nothing needs a
 * decision"), and `action` is only supplied when there is genuinely something
 * for the operator to do.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      {Icon ? (
        // Double-bezel: an outer tray holding the inner tile, so the mark reads
        // as a machined object rather than an icon floating in space.
        <div className="mb-3 rounded-[var(--radius-card)] bg-ink-100/60 p-1">
          <div className="grid size-9 place-items-center rounded-[calc(var(--radius-card)-4px)] bg-surface shadow-[var(--shadow-hairline),var(--shadow-bezel)]">
            <Icon className="size-4 text-text-muted" aria-hidden="true" />
          </div>
        </div>
      ) : null}

      <p className="text-card font-semibold text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[42ch] text-body text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
