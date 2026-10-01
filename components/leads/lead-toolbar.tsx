"use client";

import * as React from "react";
import { ArrowUpDown, Check, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LEAD_SOURCE, LEAD_STAGE, LEAD_STAGE_ORDER } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { LeadSource, LeadStage } from "@/types";
import { LEAD_SORTS, LEAD_VIEWS, type FilterState, type SortId, type ViewId } from "./filters";

const SOURCES = Object.keys(LEAD_SOURCE) as LeadSource[];

/**
 * View chips, search and the two filter menus (§11).
 *
 * The views carry live counts because a queue with a number on it is a piece of
 * information and a queue without one is a label. The counts are computed
 * against the whole book rather than the current filter, so switching views
 * never shows a count that disagrees with what lands on screen.
 */
export function LeadToolbar({
  rows,
  state,
  onChange,
  resultCount,
}: {
  rows: LeadRow[];
  state: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  resultCount: number;
}) {
  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        LEAD_VIEWS.map((view) => [view.id, rows.filter(view.match).length]),
      ) as Record<ViewId, number>,
    [rows],
  );

  const filtersActive = state.sources.length + state.stages.length > 0 || state.query.length > 0;

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="space-y-2">
      <div className="scrollbar-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
        {LEAD_VIEWS.map((view) => {
          const active = state.view === view.id;
          return (
            <button
              key={view.id}
              type="button"
              aria-pressed={active}
              title={view.description}
              onClick={() => onChange({ view: view.id })}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1 text-meta",
                "transition-colors duration-[80ms]",
                active
                  ? "bg-ink-900 font-medium text-text-onDark"
                  : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
              )}
            >
              {view.label}
              <span
                data-numeric
                className={cn(
                  "rounded-[var(--radius-micro)] px-1 text-micro tabular-nums",
                  active ? "bg-white/15 text-text-onDark" : "bg-ink-100 text-text-muted",
                )}
              >
                {counts[view.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* On a phone the search box takes the whole first row. Sharing it with
            three filter buttons shrank it to a single visible character. */}
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={state.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search name, reference, request"
            aria-label="Search enquiries"
            className="pl-8"
          />
        </div>

        <FilterMenu
          label="Channel"
          selected={state.sources.length}
          items={SOURCES.map((source) => ({
            value: source,
            label: LEAD_SOURCE[source].label,
            checked: state.sources.includes(source),
          }))}
          onToggle={(value) => onChange({ sources: toggle(state.sources, value as LeadSource) })}
          onClear={() => onChange({ sources: [] })}
        />

        <FilterMenu
          label="Stage"
          selected={state.stages.length}
          items={LEAD_STAGE_ORDER.map((stage) => ({
            value: stage,
            label: LEAD_STAGE[stage].label,
            checked: state.stages.includes(stage),
          }))}
          onToggle={(value) => onChange({ stages: toggle(state.stages, value as LeadStage) })}
          onClear={() => onChange({ stages: [] })}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown aria-hidden="true" />
              {LEAD_SORTS.find((s) => s.id === state.sort)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {LEAD_SORTS.map((sort) => (
              <DropdownMenuItem key={sort.id} onSelect={() => onChange({ sort: sort.id as SortId })}>
                {sort.label}
                {state.sort === sort.id ? <Check className="ml-auto text-brand-600" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {filtersActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ query: "", sources: [], stages: [] })}
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
          {resultCount} {resultCount === 1 ? "enquiry" : "enquiries"}
        </p>
      </div>
    </div>
  );
}

function FilterMenu({
  label,
  items,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  items: { value: string; label: string; checked: boolean }[];
  selected: number;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={selected > 0 ? "subtle" : "outline"} size="sm">
          <Filter aria-hidden="true" />
          {label}
          {selected > 0 ? (
            <span
              data-numeric
              className="rounded-[var(--radius-micro)] bg-brand-600 px-1 text-micro font-semibold text-white"
            >
              {selected}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.value}
            checked={item.checked}
            // Radix closes the menu on select by default; filtering three
            // channels one at a time through a menu that shuts each time is a
            // small cruelty.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onToggle(item.value)}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
        {selected > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onClear}>Clear {label.toLowerCase()}</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
