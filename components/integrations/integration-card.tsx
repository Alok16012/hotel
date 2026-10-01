"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, KeyRound } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IntegrationRow } from "@/lib/integrations";
import { DEMO_NOW } from "@/lib/clock";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DIRECTION_LABEL, STATE_META } from "./model";

/**
 * One service.
 *
 * The state chip is at the top and the stand-in sentence is directly beneath
 * it, because those two things have to be read together. Below that is what
 * the connection would move, in the direction it would move it, which is the
 * part a manager evaluating the product actually wants: not whether a tick is
 * green, but what changes on the day it is.
 *
 * The action is `Set up` on every card and it opens nothing. A button that
 * quietly does nothing is worse than one that says why, so it is disabled with
 * the reason attached rather than wired to a toast.
 */
export function IntegrationCard({ row }: { row: IntegrationRow }) {
  const { integration } = row;
  const state = STATE_META[integration.state];
  const isDemo = integration.state === "demo";

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-surface)] bg-surface shadow-[var(--shadow-raised)]">
      <header className="flex items-start gap-3 px-4 py-3">
        {integration.source ? (
          <SourceBadge source={integration.source} size="md" className="mt-0.5" />
        ) : (
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[var(--radius-micro)] bg-ink-100 text-micro font-semibold text-text-muted"
          >
            {integration.vendor.slice(0, 1)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-semibold text-text-primary">{integration.name}</h3>
          <p className="truncate text-micro text-text-muted">{integration.vendor}</p>
        </div>

        <Badge intent={state.intent}>{state.label}</Badge>
      </header>

      <p className="px-4 pb-2.5 text-meta text-text-secondary">{integration.summary}</p>

      <div className="border-y border-hairline bg-surface-sunken/50 px-4 py-2.5">
        <p className="text-micro text-text-secondary">{integration.standIn}</p>

        {isDemo ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-text-muted">
            <span data-numeric>
              {row.leadCount} seeded {row.leadCount === 1 ? "enquiry" : "enquiries"}
            </span>
            {row.bookingCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span data-numeric>
                  {row.bookingCount} {row.bookingCount === 1 ? "reservation" : "reservations"}
                </span>
              </>
            ) : null}
            {row.lastRecordAt ? (
              <>
                <span aria-hidden="true">·</span>
                {/* Not a sync time. The newest seeded record, said as such. */}
                <span>newest {formatRelative(row.lastRecordAt, DEMO_NOW)}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <dl className="flex flex-col gap-1.5 px-4 py-3">
        <dt className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
          What it would move
        </dt>
        {integration.syncs.map((flow) => (
          <dd key={flow.label} className="flex items-start gap-2 text-meta text-text-secondary">
            <Direction direction={flow.direction} />
            <span className="min-w-0 flex-1">{flow.label}</span>
          </dd>
        ))}
      </dl>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-hairline px-4 py-2">
        {integration.credentials?.length ? (
          <p className="flex min-w-0 items-center gap-1.5 text-micro text-text-muted">
            <KeyRound className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{integration.credentials.join(", ")}</span>
          </p>
        ) : (
          <span />
        )}

        <Button
          size="xs"
          variant="subtle"
          disabled
          title="Connecting a service needs a backend, which this build does not have."
          className="shrink-0"
        >
          Set up
        </Button>
      </footer>
    </article>
  );
}

function Direction({ direction }: { direction: "in" | "out" | "both" }) {
  const Icon =
    direction === "in" ? ArrowDownLeft : direction === "out" ? ArrowUpRight : ArrowLeftRight;

  return (
    <span
      title={DIRECTION_LABEL[direction]}
      className={cn(
        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[var(--radius-micro)]",
        direction === "in"
          ? "bg-intel-100 text-intel-700"
          : direction === "out"
            ? "bg-brand-50 text-brand-700"
            : "bg-ink-100 text-text-secondary",
      )}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      <span className="sr-only">{DIRECTION_LABEL[direction]}</span>
    </span>
  );
}
