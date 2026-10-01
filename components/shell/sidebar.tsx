"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { getNavCounts } from "@/lib/repository";
import { SidebarNav } from "./sidebar-nav";
import { SidebarFooter } from "./sidebar-footer";
import { PropertySwitcher } from "./property-switcher";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The sidebar sits on the inverse surface. That is a hierarchy decision, not
 * decoration: making the rail recede as a dark frame lets the warm canvas read
 * as the work surface, which is where the operator's attention belongs.
 *
 * Width is animated via CSS `width` transition rather than transform because
 * the main canvas must actually reflow to reclaim the space. This is the one
 * place a layout transition is correct, and it fires at most a few times a
 * session, so the reflow cost is irrelevant.
 */
export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const counts = getNavCounts();

  return (
    <div className="flex h-full flex-col bg-surface-inverse">
      <div className="p-2">
        <PropertySwitcher collapsed={collapsed} />
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} counts={counts} onNavigate={onNavigate} />
      </div>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "group/rail relative hidden shrink-0 lg:block",
        "transition-[width] duration-[240ms] ease-[var(--ease-spatial)]",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className="fixed inset-y-0 left-0 z-20 flex flex-col" style={{ width: "inherit" }}>
        <div
          className={cn(
            "h-full transition-[width] duration-[240ms] ease-[var(--ease-spatial)]",
            collapsed ? "w-[72px]" : "w-[248px]",
          )}
        >
          <SidebarContent collapsed={collapsed} />
        </div>
      </div>

      {/*
        Collapse handle rides the seam between rail and canvas, halfway down so
        it cannot collide with the property switcher at the top or the account
        menu at the bottom. It stays hidden until the pointer enters the rail:
        a control used a handful of times a session should not occupy permanent
        visual weight, but it must still be reachable by keyboard, hence the
        focus-visible escape.
      */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "fixed top-1/2 z-30 grid size-6 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)]",
              "bg-surface text-text-muted shadow-[var(--shadow-raised)]",
              "transition-[left,opacity,background-color,color] duration-[180ms] ease-[var(--ease-spatial)]",
              "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100",
              "hover:text-text-primary active:scale-[0.94]",
              collapsed ? "left-[60px]" : "left-[236px]",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-3.5" />
            ) : (
              <PanelLeftClose className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {collapsed ? "Expand" : "Collapse"}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
