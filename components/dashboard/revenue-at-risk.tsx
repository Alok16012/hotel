import Link from "next/link";
import { ColumnHead, Panel, PanelLink } from "@/components/common/panel";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ShieldCheck } from "lucide-react";
import { formatDuration, formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OpportunityReason, RevenueOpportunity } from "@/types";

/**
 * Open money, ranked by how much of it is exposed (§9).
 *
 * Every row states one reason, because a lead with four problems is still one
 * phone call. The reasons are checked in severity order upstream, so the label
 * here is the most urgent thing true about that enquiry rather than the first
 * one a loop happened to find.
 */
const REASON: Record<OpportunityReason, { label: string; tone: string }> = {
  sla_breach: { label: "Unanswered", tone: "bg-critical-500" },
  reply_pending: { label: "Reply pending", tone: "bg-caution-500" },
  payment_overdue: { label: "Payment due", tone: "bg-critical-500" },
  quote_stale: { label: "Quote cold", tone: "bg-caution-500" },
  negotiation_stalled: { label: "Stalled", tone: "bg-ink-400" },
};

export function RevenueAtRisk({ data }: { data: RevenueOpportunity }) {
  return (
    <Panel
      title="Revenue at risk"
      description="Open enquiries where the money is exposed to something the desk can fix today."
      aside={
        <div className="text-right">
          <p data-numeric className="text-section font-semibold leading-none text-text-primary">
            {formatINRCompact(data.totalAtRisk)}
          </p>
          <p className="mt-0.5 text-micro text-text-muted">
            across {data.rows.length} {data.rows.length === 1 ? "enquiry" : "enquiries"}
          </p>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelLink href="/leads">Work the queue</PanelLink>
          <p className="text-meta text-text-muted">
            Lost this week:{" "}
            <span data-numeric className="font-medium text-text-secondary">
              {formatINRCompact(data.lostThisWeekValue)}
            </span>{" "}
            over {data.lostThisWeekCount}{" "}
            {data.lostThisWeekCount === 1 ? "enquiry" : "enquiries"}
          </p>
        </div>
      }
    >
      {data.rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing is exposed"
          description="Every open enquiry has been answered, quoted or paid for inside policy."
          size="sm"
        />
      ) : (
        <table className="w-full border-collapse">
          <thead className="border-b border-hairline bg-surface-sunken/60">
            <tr>
              <ColumnHead>Guest</ColumnHead>
              <ColumnHead className="hidden md:table-cell">Why</ColumnHead>
              <ColumnHead align="right" className="hidden sm:table-cell">
                Waiting
              </ColumnHead>
              <ColumnHead align="right">At risk</ColumnHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.rows.map((row) => {
              const reason = REASON[row.reason];
              return (
                <tr
                  key={row.leadId}
                  className="group transition-colors duration-[130ms] ease-[var(--ease-out-quint)] hover:bg-ink-50"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn("size-1.5 shrink-0 rounded-full", reason.tone)}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/leads?lead=${row.leadId}`}
                          className="block truncate text-body font-medium text-text-primary hover:text-brand-700"
                        >
                          {row.guestName}
                        </Link>
                        <p className="truncate font-mono text-micro text-text-muted">
                          {row.reference}
                        </p>
                      </div>
                      {row.priority === "urgent" || row.priority === "high" ? (
                        <StatusBadge kind="leadPriority" value={row.priority} className="shrink-0" />
                      ) : null}
                    </div>
                  </td>

                  <td className="hidden max-w-[22rem] px-4 py-2 md:table-cell">
                    <p className="text-meta font-medium text-text-secondary">{reason.label}</p>
                    <p className="truncate text-meta text-text-muted">{row.detail}</p>
                  </td>

                  <td
                    data-numeric
                    className="hidden whitespace-nowrap px-4 py-2 text-right text-meta text-text-secondary sm:table-cell"
                  >
                    {formatDuration(row.waitingSec)}
                  </td>

                  <td
                    data-numeric
                    className="whitespace-nowrap px-4 py-2 text-right text-body font-semibold text-text-primary"
                  >
                    {formatINR(row.value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
