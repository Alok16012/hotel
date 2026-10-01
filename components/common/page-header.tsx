import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Every screen opens the same way: what this page is, one line of orientation,
 * then the actions that belong to it. Consistency here is what lets an operator
 * stop reading the chrome and start reading the data.
 *
 * `eyebrow` is for the parent record on detail screens ("Guest · VIP"), not for
 * decorative category tags.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** Filters, tabs or a segmented control that scope the page below. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-hairline bg-canvas px-4 pt-4 sm:px-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 flex items-center gap-1.5 text-meta text-text-muted">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="truncate text-page font-semibold text-text-primary">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-[70ch] text-body text-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {children ? <div className="mt-3">{children}</div> : null}
      {!children ? <div className="h-4" /> : null}
    </div>
  );
}

/** Standard page padding. Kept here so no screen invents its own gutter. */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4 sm:px-6", className)}>{children}</div>;
}
