"use client";

import { CalendarRange, Filter, IndianRupee, Users, X } from "lucide-react";
import { ChoiceMenu, MultiMenu } from "@/components/common/toolbar-controls";
import { Button } from "@/components/ui/button";
import { LEAD_SOURCE } from "@/lib/labels";
import type { LeadSource, TeamMember } from "@/types";
import {
  ARRIVAL_WINDOWS,
  UNASSIGNED,
  VALUE_BANDS,
  activeFilterCount,
  type BoardFilterState,
} from "./model";

const SOURCES = Object.keys(LEAD_SOURCE) as LeadSource[];

/**
 * The four scopes a pipeline review is ever run under (§15).
 *
 * Owner and channel are multi-select because a sales meeting compares two
 * people or two channels. Value and arrival are single-select because they are
 * bands on one axis, and letting someone tick "under Rs 25,000" and "over Rs 2
 * lakh" at once produces a board nobody can reason about.
 */
export function PipelineToolbar({
  team,
  state,
  onChange,
  shown,
  total,
}: {
  team: TeamMember[];
  state: BoardFilterState;
  onChange: (next: Partial<BoardFilterState>) => void;
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(state);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MultiMenu
        icon={Users}
        label="Owner"
        selected={state.owners.length}
        onClear={() => onChange({ owners: [] })}
        items={[
          ...team.map((member) => ({
            value: member.id,
            label: member.name,
            checked: state.owners.includes(member.id),
          })),
          {
            value: UNASSIGNED,
            label: "Unassigned",
            checked: state.owners.includes(UNASSIGNED),
          },
        ]}
        onToggle={(value) => onChange({ owners: toggle(state.owners, value) })}
      />

      <MultiMenu
        icon={Filter}
        label="Channel"
        selected={state.sources.length}
        onClear={() => onChange({ sources: [] })}
        items={SOURCES.map((source) => ({
          value: source,
          label: LEAD_SOURCE[source].label,
          checked: state.sources.includes(source),
        }))}
        onToggle={(value) => onChange({ sources: toggle(state.sources, value as LeadSource) })}
      />

      <ChoiceMenu
        icon={IndianRupee}
        heading="Value band"
        options={VALUE_BANDS}
        value={state.valueBand}
        onSelect={(id) => onChange({ valueBand: id })}
      />

      <ChoiceMenu
        icon={CalendarRange}
        heading="Arrival window"
        options={ARRIVAL_WINDOWS}
        value={state.arrival}
        onSelect={(id) => onChange({ arrival: id })}
      />

      {active > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ owners: [], sources: [], valueBand: "any", arrival: "any" })}
        >
          <X aria-hidden="true" />
          Clear
        </Button>
      ) : null}

      <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
        {shown === total
          ? `${total} ${total === 1 ? "enquiry" : "enquiries"} on the board`
          : `${shown} of ${total} enquiries shown`}
      </p>
    </div>
  );
}
