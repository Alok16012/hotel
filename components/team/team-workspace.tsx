"use client";

import * as React from "react";
import { PageHeader } from "@/components/common/page-header";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Panel, PanelLink } from "@/components/common/panel";
import type { TeamView } from "@/lib/team";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AuthorityLadder } from "./authority-ladder";
import { MemberCard } from "./member-card";
import { PermissionMatrix } from "./permission-matrix";
import { TEAM_SORTS, type TeamSortId, sortTeam } from "./model";

/**
 * The desk (§40).
 *
 * Ordered as a manager would read it: who is on now and what is sitting on
 * them, then how the month has gone, then the rules that decide what any of
 * them can do without asking. The permissions and the discount ladder are at
 * the bottom because they are reference, consulted when something is disputed,
 * not scanned every morning.
 */
export function TeamWorkspace({ view }: { view: TeamView }) {
  const [sort, setSort] = React.useState<TeamSortId>("workload");
  const rows = React.useMemo(() => sortTeam(view.rows, sort), [view.rows, sort]);
  const { summary } = view;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Team"
        description="Who is on the floor, what is sitting on each of them, and what they can decide without asking."
        actions={
          // Sorting as the question being asked, not as a column header.
          // "Who is slowest to reply" is a different question from "who has
          // the most open", and a manager arrives already holding one of them.
          <SegmentedControl
            label="Order the directory"
            options={TEAM_SORTS}
            value={sort}
            onChange={setSort}
          />
        }
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:gap-4">
          <SummaryStrip summary={summary} />

          <section>
            <h2 className="sr-only">Directory</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4">
              {rows.map((row) => (
                <MemberCard key={row.member.id} row={row} />
              ))}
            </div>
          </section>

          {/* Both of these are wide reference: the matrix is a table that needs
              every column on screen at once, and the ladder reads as a scale.
              Sitting them side by side would force the table to scroll
              sideways, which is the one thing a comparison must not do. */}
          <Panel
            title="Discount authority"
            description="How far each role can move a rate before it needs a second name on it."
            footer={<PanelLink href="/exceptions">See the requests waiting for approval</PanelLink>}
          >
            <AuthorityLadder authority={view.authority} roleLabels={view.roleLabels} />
          </Panel>

          <Panel
            title="What each role may do"
            description="Capabilities, not screens. A role is added once and everyone in it inherits the same answers."
            bodyClassName="pb-1"
            footer={
              <p className="text-meta text-text-muted">
                Amber means the work can be started by that role and has to be signed off by
                someone else. That middle state is how a night shift functions.
              </p>
            }
          >
            <PermissionMatrix
              permissions={view.permissions}
              roleOrder={view.roleOrder}
              roleLabels={view.roleLabels}
            />
          </Panel>

          <p className="pb-2 text-meta text-text-muted">
            Open enquiries, follow-ups and escalations are counted from the records as they stand
            now. Median reply, target compliance and conversion are a trailing thirty day
            measurement and do not move when work is reassigned today.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * The four facts worth knowing before reading any individual card.
 *
 * Unassigned enquiries lead because they are the only figure here that nobody
 * owns: every other number has a person attached who can be asked about it.
 */
function SummaryStrip({ summary }: { summary: TeamView["summary"] }) {
  const spread =
    summary.fastestSec > 0
      ? `${formatDuration(summary.fastestSec)} to ${formatDuration(summary.slowestSec)}`
      : "Not measured";

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-surface)] bg-hairline shadow-[var(--shadow-raised)] lg:grid-cols-4">
      <Cell
        label="Unassigned enquiries"
        value={String(summary.unassigned)}
        hint={summary.unassigned > 0 ? "Nobody's name on them yet" : "Everything has an owner"}
        tone={summary.unassigned > 0 ? "caution" : undefined}
      />
      <Cell
        label="On shift now"
        value={`${summary.onShift} of ${summary.total}`}
        hint="By the roster, not by presence"
      />
      <Cell
        label="Carrying a breach"
        value={String(summary.membersBreaching)}
        hint={`At least one enquiry past the ${formatDuration(summary.slaTargetSec)} target`}
        tone={summary.membersBreaching > 0 ? "critical" : undefined}
      />
      <Cell label="Median reply spread" value={spread} hint="Fastest to slowest on the desk" />
    </div>
  );
}

function Cell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "caution" | "critical";
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p
        data-numeric
        className={cn(
          "mt-1 text-section font-semibold leading-none tracking-[-0.01em]",
          tone === "critical"
            ? "text-critical-700"
            : tone === "caution"
              ? "text-caution-700"
              : "text-text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-micro text-text-muted">{hint}</p>
    </div>
  );
}

