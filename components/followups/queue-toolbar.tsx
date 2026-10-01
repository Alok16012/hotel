"use client";

import { Bot, Tag, Users, X } from "lucide-react";
import { ChoiceMenu, MultiMenu, ScopeChip } from "@/components/common/toolbar-controls";
import { Button } from "@/components/ui/button";
import { FOLLOW_UP_REASON } from "@/lib/labels";
import type { FollowUpReason, TeamMember } from "@/types";
import {
  BUCKETS,
  EMPTY_QUEUE_FILTERS,
  ORIGINS,
  activeFilterCount,
  type BucketId,
  type QueueFilterState,
} from "./model";

const REASONS = Object.keys(FOLLOW_UP_REASON) as FollowUpReason[];

/**
 * Scope on the first row, narrowing on the second (§14).
 *
 * The scope chips are not filters and are not styled like them. They choose how
 * much of the day to look at, and the default looks at all of the open work at
 * once, grouped, because a queue split into tabs hides the overdue pile behind
 * a click on the one morning somebody most needs to see it.
 */
export function QueueToolbar({
  team,
  state,
  counts,
  onChange,
  shown,
  total,
}: {
  team: TeamMember[];
  state: QueueFilterState;
  counts: Record<BucketId, number>;
  onChange: (next: Partial<QueueFilterState>) => void;
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(state);
  const openCount = counts.overdue + counts.today + counts.upcoming;

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Which follow-ups to show"
        className="scrollbar-slim flex items-center gap-1 overflow-x-auto"
      >
        <ScopeChip
          id="open"
          label="All open"
          count={openCount}
          current={state.scope}
          onSelect={(next) => onChange({ scope: next })}
        />
        {BUCKETS.map((bucket) => (
          <ScopeChip
            key={bucket.id}
            id={bucket.id}
            label={bucket.label}
            count={counts[bucket.id]}
            // Overdue is the only count that gets colour. If every chip is
            // urgent then none of them is.
            urgent={bucket.id === "overdue"}
            current={state.scope}
            onSelect={(next) => onChange({ scope: next })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MultiMenu
          icon={Users}
          label="Owner"
          selected={state.owners.length}
          onClear={() => onChange({ owners: [] })}
          items={team.map((member) => ({
            value: member.id,
            label: member.name,
            checked: state.owners.includes(member.id),
          }))}
          onToggle={(value) => onChange({ owners: toggle(state.owners, value) })}
        />

        <MultiMenu
          icon={Tag}
          label="Reason"
          selected={state.reasons.length}
          onClear={() => onChange({ reasons: [] })}
          items={REASONS.map((reason) => ({
            value: reason,
            label: FOLLOW_UP_REASON[reason],
            checked: state.reasons.includes(reason),
          }))}
          onToggle={(value) => onChange({ reasons: toggle(state.reasons, value as FollowUpReason) })}
        />

        <ChoiceMenu
          icon={Bot}
          heading="Scheduled by"
          options={ORIGINS}
          value={state.origin}
          onSelect={(id) => onChange({ origin: id })}
        />

        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                owners: EMPTY_QUEUE_FILTERS.owners,
                reasons: EMPTY_QUEUE_FILTERS.reasons,
                origin: EMPTY_QUEUE_FILTERS.origin,
              })
            }
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
          {shown === total
            ? `${total} ${total === 1 ? "touchpoint" : "touchpoints"}`
            : `${shown} of ${total} touchpoints shown`}
        </p>
      </div>
    </div>
  );
}
