import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The product's one container.
 *
 * Every region on every screen is the same object: a raised surface with a
 * titled header rail, an optional control on that rail, and an optional footer
 * link out. Using one shell everywhere is what lets the eye stop parsing the
 * chrome; the differences between regions then read as differences in the
 * data, which is the point.
 *
 * It began on the dashboard and ended up in thirty files, which is why it now
 * lives here rather than under one screen's folder.
 */
export function Panel({
  title,
  description,
  aside,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Counts, filters or a small control, set against the title on the rail. */
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-surface)] bg-surface",
        "shadow-[var(--shadow-raised)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-card font-semibold text-text-primary">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-meta text-text-muted">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-1.5">{aside}</div> : null}
      </header>

      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="border-t border-hairline bg-surface-sunken/60 px-4 py-2">{footer}</footer>
      ) : null}
    </section>
  );
}

/** The standard footer: one link out to the screen that owns this data. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-meta font-medium text-text-secondary",
        "transition-colors duration-[130ms] ease-[var(--ease-out-quint)] hover:text-brand-700",
      )}
    >
      {children}
      <ArrowRight
        className="size-3 transition-transform duration-[130ms] ease-[var(--ease-out-quint)] group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Column heading for the small tables inside panels.
 *
 * Uppercase micro type with wide tracking, which at 11px stops reading as
 * content and starts reading as structure.
 */
export function ColumnHead({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
