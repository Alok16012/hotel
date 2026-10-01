"use client";

import * as React from "react";
import { Check } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * The three controls every list screen in this product filters with.
 *
 * Four toolbars held their own copies of these: the booking ledger, the
 * follow-up queue, the exception list and the pipeline. They were identical
 * apart from drift nobody had chosen, which is the reason to lift them: a
 * person who has learned to filter one list here should not have to learn a
 * second grammar for the next one, and four copies is how that promise gets
 * quietly broken one screen at a time.
 *
 * The grammar itself: scope chips across the top say which slice of the world
 * is in view and carry its size, then the row beneath narrows what is already
 * chosen. Scope is a different kind of decision from a filter, so it gets a
 * different kind of control.
 */

/**
 * One slice of a list, with the count that makes it worth picking.
 *
 * The count is the argument for the chip. "Owing 6" is a reason to click;
 * "Owing" on its own is a category. The urgent variant colours the count and
 * not the label, because it is the quantity that has gone wrong, and it drops
 * back to the muted treatment at zero: nothing is overdue is not an alarm.
 */
export function ScopeChip<T extends string>({
  id,
  label,
  count,
  urgent = false,
  current,
  onSelect,
}: {
  id: T;
  label: string;
  count: number;
  /** Colour the count when it is above zero. For scopes that mean trouble. */
  urgent?: boolean;
  current: T;
  onSelect: (id: T) => void;
}) {
  const selected = current === id;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1",
        "text-meta transition-colors duration-[var(--duration-instant)]",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
        selected
          ? "bg-ink-900 font-medium text-text-onDark"
          : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
      )}
    >
      {label}
      <span
        data-numeric
        className={cn(
          "text-micro tabular-nums",
          selected
            ? "text-text-onDark-muted"
            : urgent && count > 0
              ? "font-semibold text-critical-700"
              : "text-text-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Any number of values from one field.
 *
 * The menu stays open on each tick, because nobody narrows by exactly one
 * status and then stops. The badge on the trigger carries how many are on, so
 * a filtered list can be read as filtered without opening the menu, and the
 * clear item only appears once there is something to clear.
 */
export function MultiMenu({
  icon: Icon,
  label,
  items,
  selected,
  onToggle,
  onClear,
}: {
  icon: React.ElementType;
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
          <Icon aria-hidden="true" />
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
      <DropdownMenuContent align="start" className="min-w-[13rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.value}
            checked={item.checked}
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

/**
 * Exactly one of several, with the current one on the trigger.
 *
 * Used for sorting, where the chosen option is the label: a button reading
 * "Longest waiting" says more than one reading "Sort". The first option is
 * treated as the default, and the trigger only takes the filled treatment once
 * the list has been moved off it, so an untouched toolbar stays quiet.
 */
export function ChoiceMenu<T extends string>({
  icon: Icon,
  heading,
  options,
  value,
  onSelect,
}: {
  icon: React.ElementType;
  heading: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onSelect: (id: T) => void;
}) {
  const current = options.find((option) => option.id === value) ?? options[0];
  const isDefault = current.id === options[0].id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isDefault ? "outline" : "subtle"} size="sm">
          <Icon aria-hidden="true" />
          <span className={cn(isDefault && "text-text-secondary")}>{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[13rem]">
        <DropdownMenuLabel>{heading}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => onSelect(option.id)}>
            {option.label}
            {option.id === value ? <Check className="ml-auto text-brand-600" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
