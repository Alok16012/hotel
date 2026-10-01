"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  /** Numbers are allowed because one caller's options are day counts. */
  id: T;
  label: string;
  /** Native tooltip, for options whose label has to stay terse. */
  hint?: string;
}

/**
 * One choice from a short, fixed set, all of them visible.
 *
 * Used where the options are few enough to show and the user is switching
 * between them rather than picking once: the measurement window on analytics,
 * the ordering on the team directory, the connection filter on integrations,
 * the period on a report, the automation mode on each settings rule. A select
 * would hide the alternatives behind a click, and the alternatives are the
 * point: the control is read as "these are the questions I can ask".
 *
 * Recessed track, raised selected face. The bezel shadow is what makes the
 * unselected options read as unpressed rather than as disabled text, which is
 * the failure mode of flat segmented controls.
 *
 * Five screens held their own copy of this before it was lifted here, and one
 * of them had a focus ring the other four had lost. Assistive-technology
 * behaviour is now settled in one place: `role="group"` with a label, and
 * `aria-pressed` on each option so a screen reader announces the state rather
 * than only the name.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** What the group as a whole is choosing between, for assistive technology. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] bg-surface-sunken p-0.5",
        "shadow-[var(--shadow-bezel)]",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-[var(--radius-sm)] px-2.5 py-1 text-meta",
              "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-out-quint)]",
              "active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              selected
                ? "bg-surface font-medium text-text-primary shadow-[var(--shadow-raised)]"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
