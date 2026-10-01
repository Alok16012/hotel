"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type NavItem } from "./nav-config";
import type { NavCounts } from "@/lib/repository";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarNavProps {
  collapsed: boolean;
  counts: NavCounts;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, counts, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-4 px-3 py-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          {/* The label is hidden when collapsed but the grouping survives as a
              rule, so the sections don't dissolve into one long list. */}
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-hairline-inverse" aria-hidden="true" />
          ) : (
            <h2 className="mb-1 px-2 text-micro font-semibold uppercase tracking-[0.08em] text-text-onDark-muted/70">
              {section.label}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  count={item.badgeKey ? counts[item.badgeKey] : undefined}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  collapsed,
  pathname,
  count,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  count?: number;
  onNavigate?: () => void;
}) {
  const prefix = item.matchPrefix ?? item.href;
  const isActive = pathname === prefix || pathname.startsWith(`${prefix}/`);
  const Icon = item.icon;
  const showBadge = typeof count === "number" && count > 0;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center rounded-[var(--radius-control)]",
        "text-body transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2",
        isActive
          ? "text-white"
          : "text-text-onDark-muted hover:bg-white/[0.06] hover:text-text-onDark",
      )}
    >
      {/* Shared-element active pill. layoutId lets it slide between items
          rather than cross-fading, which keeps the spatial relationship. */}
      {isActive ? (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-[var(--radius-control)] bg-brand-600/90 shadow-[var(--shadow-bezel-inverse)]"
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          aria-hidden="true"
        />
      ) : null}

      <Icon
        className={cn(
          "relative z-10 size-4 shrink-0 transition-colors",
          isActive ? "text-white" : "text-text-onDark-muted group-hover:text-text-onDark",
        )}
        strokeWidth={isActive ? 2.1 : 1.8}
      />

      {!collapsed ? (
        <>
          <span className="relative z-10 truncate">{item.label}</span>
          {showBadge ? <NavBadge count={count} intent={item.badgeIntent} /> : null}
        </>
      ) : null}

      {/* Collapsed rail still has to signal urgency, so the badge degrades to
          a dot rather than vanishing. Never colour alone: the tooltip carries
          the number for anyone who can't read the hue. */}
      {collapsed && showBadge ? (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 z-10 size-1.5 rounded-full ring-2 ring-surface-inverse",
            item.badgeIntent === "critical"
              ? "bg-critical-500"
              : item.badgeIntent === "caution"
                ? "bg-caution-500"
                : "bg-accent-500",
          )}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
        {showBadge ? (
          <span className="text-text-onDark-muted">({count})</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function NavBadge({ count, intent }: { count: number; intent?: NavItem["badgeIntent"] }) {
  return (
    <span
      className={cn(
        "relative z-10 ml-auto inline-grid h-4 min-w-4 place-items-center rounded-full px-1 text-micro font-semibold tabular-nums",
        intent === "critical"
          ? "bg-critical-500 text-white"
          : intent === "caution"
            ? "bg-caution-500 text-ink-950"
            : "bg-white/12 text-text-onDark",
      )}
    >
      {count}
    </span>
  );
}
