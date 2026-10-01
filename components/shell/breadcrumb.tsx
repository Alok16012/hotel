"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { findActiveNavItem } from "./nav-config";

/**
 * Breadcrumb derived from the route rather than passed down by every page,
 * so a new route cannot ship with a missing or stale trail.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);
  if (!active) return null;

  const prefix = active.matchPrefix ?? active.href;
  const rest = pathname.slice(prefix.length).split("/").filter(Boolean);
  const isDetail = rest.length > 0;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-meta">
        <li className="shrink-0">
          {isDetail ? (
            <Link
              href={active.href}
              className="rounded-[var(--radius-micro)] text-text-muted transition-colors hover:text-text-primary"
            >
              {active.label}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">{active.label}</span>
          )}
        </li>
        {isDetail ? (
          <>
            <li aria-hidden="true" className="shrink-0">
              <ChevronRight className="size-3 text-ink-300" />
            </li>
            <li className="min-w-0">
              {/* Detail pages replace this label via the page header; showing
                  the raw segment keeps the trail honest until they do. */}
              <span
                className="block truncate font-medium text-text-primary"
                aria-current="page"
                data-breadcrumb-leaf
              >
                Detail
              </span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
