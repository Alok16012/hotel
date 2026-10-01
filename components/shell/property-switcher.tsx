"use client";

import { Check, ChevronsUpDown, Hotel as HotelIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { getProperties } from "@/lib/repository";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PropertySwitcher({ collapsed }: { collapsed: boolean }) {
  const properties = getProperties();
  const activeId = useUi((s) => s.activePropertyId);
  const setActive = useUi((s) => s.setActiveProperty);
  const active = properties.find((p) => p.id === activeId) ?? properties[0];

  const trigger = (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center rounded-[var(--radius-card)] text-left",
        "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:bg-white/[0.06] active:bg-white/[0.09]",
        collapsed ? "justify-center p-1.5" : "gap-2 p-1.5",
      )}
      aria-label={`Property: ${active.name}. Change property`}
    >
      {/* Double-bezel: an outer shell holding an inner core, with concentric
          radii, so the mark reads as a machined object rather than a swatch. */}
      <span className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-control)] bg-white/[0.07] p-px shadow-[var(--shadow-bezel-inverse)]">
        <span className="grid size-full place-items-center rounded-[calc(var(--radius-control)-1px)] bg-gradient-to-b from-brand-400 to-brand-600">
          <HotelIcon className="size-3.5 text-white" strokeWidth={2} />
        </span>
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta font-semibold leading-tight text-text-onDark">
              {active.name}
            </span>
            <span className="block truncate text-micro leading-tight text-text-onDark-muted">
              {active.city}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-text-onDark-muted transition-colors group-hover:text-text-onDark" />
        </>
      ) : null}
    </button>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {active.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}

      <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} className="w-60">
        <DropdownMenuLabel>Properties</DropdownMenuLabel>
        {properties.map((p) => {
          const isActive = p.id === active.id;
          return (
            <DropdownMenuItem key={p.id} onSelect={() => setActive(p.id)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-meta text-text-muted">
                  {p.city} · {p.totalRooms} rooms
                </span>
              </span>
              {isActive ? <Check className="size-4 text-brand-600" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
