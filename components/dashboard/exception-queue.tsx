"use client";

import * as React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelLink } from "@/components/common/panel";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_NOW } from "@/lib/clock";
import { formatINR, formatRelative } from "@/lib/format";
import { EXCEPTION_KIND } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ExceptionItem, ExceptionStatus } from "@/types";

/**
 * The exception queue (§20) — the only part of the Command Center where the
 * software has deliberately stopped and asked for a person.
 *
 * Each card gives the operator the three things a decision needs and nothing
 * else: what was asked, what it costs, and what the system would do. The
 * recommendation is labelled and visually separated so it can never be mistaken
 * for a decision already taken.
 *
 * Resolution is local state. No request is made and nothing is persisted; this
 * is the interaction the backend will later own, wired up so the workflow can
 * be walked end to end today.
 */
export function ExceptionQueue({ exceptions }: { exceptions: ExceptionItem[] }) {
  const [resolved, setResolved] = React.useState<Record<string, ExceptionStatus>>({});

  const open = exceptions.filter((e) => !resolved[e.id]);
  const decidedCount = Object.keys(resolved).length;

  function decide(item: ExceptionItem, status: ExceptionStatus, label: string) {
    setResolved((prev) => ({ ...prev, [item.id]: status }));
    toast.success(`${item.reference} ${label}`, {
      description: item.title,
      action: {
        label: "Undo",
        onClick: () =>
          setResolved((prev) => {
            const next = { ...prev };
            delete next[item.id];
            return next;
          }),
      },
    });
  }

  return (
    <Panel
      title="Waiting on a decision"
      description="Held back by policy, not by the queue. Each one names the rule it crossed."
      aside={
        <Badge intent={open.length > 0 ? "caution" : "positive"} size="md" data-numeric>
          {open.length} open
        </Badge>
      }
      footer={<PanelLink href="/exceptions">Open the exception centre</PanelLink>}
    >
      {open.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is waiting on a person"
          description={
            decidedCount > 0
              ? `All ${decidedCount} cleared. Anything the rules cannot settle on their own will appear here.`
              : "The automation is handling every enquiry inside policy. Exceptions surface here the moment one is not."
          }
          size="sm"
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {open.map((item) => (
            <ExceptionRow key={item.id} item={item} onDecide={decide} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ExceptionRow({
  item,
  onDecide,
}: {
  item: ExceptionItem;
  onDecide: (item: ExceptionItem, status: ExceptionStatus, label: string) => void;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="exceptionSeverity" value={item.severity} />
            <Badge intent="outline">{EXCEPTION_KIND[item.kind]}</Badge>
            <span className="font-mono text-micro text-text-muted">{item.reference}</span>
            <span className="text-micro text-text-muted">
              {formatRelative(item.raisedAt, DEMO_NOW)}
            </span>
          </div>
          <p className="mt-1.5 text-card font-semibold text-text-primary">{item.title}</p>
        </div>

        <div className="shrink-0 text-right">
          <p
            data-numeric
            className={cn(
              "text-card font-semibold",
              item.businessImpact < 0 ? "text-critical-700" : "text-positive-700",
            )}
          >
            {item.businessImpact < 0 ? "-" : "+"}
            {formatINR(Math.abs(item.businessImpact))}
          </p>
          <p className="text-micro text-text-muted">against policy</p>
        </div>
      </div>

      <p className="mt-1.5 text-body leading-relaxed text-text-secondary">{item.reason}</p>

      {/* The intelligence layer speaks in its own material (§28: purple is
          reserved for AI) and always behind a label, so an operator is never
          unsure whether they are reading a fact or a suggestion. */}
      <div className="mt-2.5 rounded-[var(--radius-card)] bg-intel-100/55 px-3 py-2">
        <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-intel-700">
          <Sparkles className="size-3" aria-hidden="true" />
          Recommended
        </p>
        <p className="mt-1 text-body leading-relaxed text-text-secondary">
          {item.systemRecommendation}
        </p>
      </div>

      {item.policyThreshold ? (
        <p className="mt-2 text-meta text-text-muted">Policy: {item.policyThreshold}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="primary" onClick={() => onDecide(item, "approved", "approved")}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDecide(item, "modified", "sent back with a counter")}
        >
          Counter
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDecide(item, "rejected", "declined")}
        >
          Decline
        </Button>
        {/* On a phone this sits on its own line and wraps. Truncating it there
            cut the sentence mid-word, which told the operator less than
            nothing about what they were approving. */}
        <span className="w-full text-micro text-text-muted sm:ml-auto sm:w-auto sm:max-w-full sm:truncate">
          {item.requestedAction}
        </span>
      </div>
    </li>
  );
}
