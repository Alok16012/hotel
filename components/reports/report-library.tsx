"use client";

import { Badge } from "@/components/ui/badge";
import type { ReportEntry } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { CADENCE_LABEL, CADENCE_ORDER } from "./model";

/**
 * The library, grouped by how often each sheet is drawn.
 *
 * Grouped by cadence rather than listed flat because cadence is how a
 * property thinks about these: the daily sheet is a shift handover, the
 * monthly one is a board paper. Each entry names its audience, which is the
 * fastest way to tell whether a report is the one you want.
 */
export function ReportLibrary({
  entries,
  selectedId,
  onSelect,
}: {
  entries: ReportEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {CADENCE_ORDER.map((cadence) => {
        const group = entries.filter((entry) => entry.definition.cadence === cadence);
        if (group.length === 0) return null;

        return (
          <section key={cadence}>
            <h3 className="px-1 pb-1 text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
              {CADENCE_LABEL[cadence]}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {group.map((entry) => {
                const selected = entry.definition.id === selectedId;
                return (
                  <li key={entry.definition.id}>
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => onSelect(entry.definition.id)}
                      className={cn(
                        "w-full rounded-[var(--radius-control)] px-2.5 py-2 text-left",
                        "transition-colors duration-[var(--duration-micro)]",
                        selected
                          ? "bg-surface shadow-[var(--shadow-raised)]"
                          : "hover:bg-ink-50/70",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-body",
                          selected
                            ? "font-semibold text-text-primary"
                            : "font-medium text-text-secondary",
                        )}
                      >
                        {entry.definition.name}
                      </span>
                      <span className="mt-0.5 block text-micro text-text-muted">
                        {entry.definition.audience}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="px-1 pt-1 text-micro text-text-muted">
        Five standing sheets. Anything else is a question for the analytics screen, where a figure
        can be turned over rather than filed.
      </p>
    </div>
  );
}

/** What the selected report is for, read before its figures are trusted. */
export function ReportBrief({ entry }: { entry: ReportEntry }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <p className="text-body text-text-secondary">{entry.definition.summary}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge intent="neutral">{CADENCE_LABEL[entry.definition.cadence]}</Badge>
        <Badge intent="outline">{entry.definition.audience}</Badge>
      </div>

      <div>
        <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
          What it settles
        </p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {entry.definition.answers.map((answer) => (
            <li key={answer} className="flex gap-2 text-meta text-text-secondary">
              <span aria-hidden="true" className="text-text-muted">
                &middot;
              </span>
              <span className="min-w-0 flex-1">{answer}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-micro text-text-muted">{entry.definition.sourceNote}</p>
    </div>
  );
}
