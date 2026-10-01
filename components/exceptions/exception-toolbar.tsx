"use client";

import { ArrowUpDown, Gauge, Shapes, X } from "lucide-react";
import { ChoiceMenu, MultiMenu, ScopeChip } from "@/components/common/toolbar-controls";
import { Button } from "@/components/ui/button";
import { EXCEPTION_KIND, EXCEPTION_SEVERITY } from "@/lib/labels";
import type { ExceptionKind, ExceptionSeverity } from "@/types";
import {
  EMPTY_EXCEPTION_FILTERS,
  KINDS,
  SCOPES,
  SEVERITIES,
  SORTS,
  activeFilterCount,
  type ExceptionFilterState,
  type ScopeId,
} from "./model";

/**
 * Scope on the first row, narrowing on the second (§20).
 *
 * The default scope is the undecided pile, because that is the only list on
 * this screen anybody is obliged to act on. Everything already decided stays one
 * click away rather than mixed in, so the queue length means what it says.
 */
export function ExceptionToolbar({
  state,
  counts,
  onChange,
  shown,
  total,
}: {
  state: ExceptionFilterState;
  counts: Record<ScopeId, number>;
  onChange: (next: Partial<ExceptionFilterState>) => void;
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(state);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Which exceptions to show"
        className="scrollbar-slim flex items-center gap-1 overflow-x-auto"
      >
        {SCOPES.map((scope) => (
          <ScopeChip
            key={scope.id}
            id={scope.id}
            label={scope.label}
            count={counts[scope.id]}
            // Only the undecided pile gets colour on its count. If every chip
            // reads as urgent then the word has stopped working.
            urgent={scope.id === "queue"}
            current={state.scope}
            onSelect={(next) => onChange({ scope: next })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MultiMenu
          icon={Shapes}
          label="Type"
          selected={state.kinds.length}
          onClear={() => onChange({ kinds: [] })}
          items={KINDS.map((kind) => ({
            value: kind,
            label: EXCEPTION_KIND[kind],
            checked: state.kinds.includes(kind),
          }))}
          onToggle={(value) => onChange({ kinds: toggle(state.kinds, value as ExceptionKind) })}
        />

        <MultiMenu
          icon={Gauge}
          label="Severity"
          selected={state.severities.length}
          onClear={() => onChange({ severities: [] })}
          items={SEVERITIES.map((severity) => ({
            value: severity,
            label: EXCEPTION_SEVERITY[severity].label,
            checked: state.severities.includes(severity),
          }))}
          onToggle={(value) =>
            onChange({ severities: toggle(state.severities, value as ExceptionSeverity) })
          }
        />

        <ChoiceMenu
          icon={ArrowUpDown}
          heading="Order the queue by"
          options={SORTS}
          value={state.sort}
          onSelect={(id) => onChange({ sort: id })}
        />

        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                kinds: EMPTY_EXCEPTION_FILTERS.kinds,
                severities: EMPTY_EXCEPTION_FILTERS.severities,
              })
            }
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
          {shown === total
            ? `${total} ${total === 1 ? "exception" : "exceptions"}`
            : `${shown} of ${total} exceptions shown`}
        </p>
      </div>
    </div>
  );
}
