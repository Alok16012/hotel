"use client";

import * as React from "react";
import { ArrowUpDown, Check, Search, Tag, X } from "lucide-react";
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
import { GUEST_SEGMENT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { GuestSegment } from "@/types";
import {
  EMPTY_FILTERS,
  SCOPES,
  SEGMENTS,
  SORTS,
  activeFilterCount,
  type DirectoryFilterState,
  type ScopeId,
  type SortId,
} from "./model";

/**
 * Scope on the first row, search and narrowing on the second (§16).
 *
 * The same two-row grammar as the follow-up queue, because an operator who has
 * learned where the scope chips live on one screen should not have to learn it
 * again on the next.
 */
export function DirectoryToolbar({
  state,
  counts,
  onChange,
  shown,
  total,
}: {
  state: DirectoryFilterState;
  counts: Record<ScopeId, number>;
  onChange: (next: Partial<DirectoryFilterState>) => void;
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(state);
  const sort = SORTS.find((s) => s.id === state.sort) ?? SORTS[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Which guests to show"
        className="scrollbar-slim flex items-center gap-1 overflow-x-auto"
      >
        {SCOPES.map((scope) => (
          <button
            key={scope.id}
            type="button"
            aria-pressed={state.scope === scope.id}
            onClick={() => onChange({ scope: scope.id })}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1",
              "text-meta transition-colors duration-[80ms]",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              state.scope === scope.id
                ? "bg-ink-900 font-medium text-text-onDark"
                : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
            )}
          >
            {scope.label}
            <span
              data-numeric
              className={cn(
                "text-micro tabular-nums",
                state.scope === scope.id
                  ? "text-text-onDark-muted"
                  : scope.id === "attention" && counts.attention > 0
                    ? "font-semibold text-critical-700"
                    : "text-text-muted",
              )}
            >
              {counts[scope.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={state.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search name, phone, city, company"
            aria-label="Search guests"
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={state.segments.length > 0 ? "subtle" : "outline"} size="sm">
              <Tag aria-hidden="true" />
              Segment
              {state.segments.length > 0 ? (
                <span
                  data-numeric
                  className="rounded-[var(--radius-micro)] bg-brand-600 px-1 text-micro font-semibold text-white"
                >
                  {state.segments.length}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[12rem]">
            <DropdownMenuLabel>Segment</DropdownMenuLabel>
            {SEGMENTS.map((segment) => (
              <DropdownMenuCheckboxItem
                key={segment}
                checked={state.segments.includes(segment)}
                // Held open: picking VIP and corporate together is one thought,
                // not two trips to the same menu.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() =>
                  onChange({
                    segments: state.segments.includes(segment)
                      ? state.segments.filter((s) => s !== segment)
                      : [...state.segments, segment as GuestSegment],
                  })
                }
              >
                {GUEST_SEGMENT[segment].label}
              </DropdownMenuCheckboxItem>
            ))}
            {state.segments.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onChange({ segments: [] })}>
                  Clear segments
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={state.sort === EMPTY_FILTERS.sort ? "outline" : "subtle"} size="sm">
              <ArrowUpDown aria-hidden="true" />
              <span
                className={cn(state.sort === EMPTY_FILTERS.sort && "text-text-secondary")}
              >
                {sort.label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[13rem]">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {SORTS.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => onChange({ sort: option.id as SortId })}
              >
                {option.label}
                {option.id === state.sort ? <Check className="ml-auto text-brand-600" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ query: "", segments: [] })}
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
          {shown === total
            ? `${total} ${total === 1 ? "guest" : "guests"}`
            : `${shown} of ${total} guests shown`}
        </p>
      </div>
    </div>
  );
}
