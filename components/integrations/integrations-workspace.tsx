"use client";

import * as React from "react";
import { PageHeader } from "@/components/common/page-header";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import type { IntegrationsView } from "@/lib/integrations";
import { CredentialsPanel } from "./credentials-panel";
import { IntegrationCard } from "./integration-card";
import { INTEGRATION_FILTERS, STATE_META, type IntegrationFilter } from "./model";

/**
 * Connections (§41).
 *
 * The first thing on the screen is the disclosure, not a grid of logos. This
 * build talks to nothing, and a page of connection cards is exactly where that
 * would be easiest to forget and most damaging to misread, so the legend
 * states all three states including the one nothing is in.
 */
export function IntegrationsWorkspace({ view }: { view: IntegrationsView }) {
  const [filter, setFilter] = React.useState<IntegrationFilter>("all");

  const groups = React.useMemo(
    () =>
      view.groups
        .map((group) => ({
          ...group,
          rows:
            filter === "all"
              ? group.rows
              : group.rows.filter((row) => row.integration.state === filter),
        }))
        .filter((group) => group.rows.length > 0),
    [view.groups, filter],
  );

  const allIntegrations = React.useMemo(
    () => view.groups.flatMap((group) => group.rows.map((row) => row.integration)),
    [view.groups],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Integrations"
        description="What this product would connect to, and exactly what each connection is doing today."
        actions={
          <SegmentedControl
            label="Filter by connection state"
            options={INTEGRATION_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        }
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:gap-4">
          <Panel
            title="Nothing on this screen is live"
            description={`${view.counts.demo} services are represented by seeded records, ${view.counts.not_connected} have no substitute at all, and none are connected.`}
          >
            <ul className="flex flex-col gap-2.5 px-4 py-3">
              {(["demo", "not_connected", "connected"] as const).map((state) => (
                <li key={state} className="flex items-start gap-2.5">
                  <Badge intent={STATE_META[state].intent} className="mt-0.5 shrink-0">
                    {STATE_META[state].label}
                  </Badge>
                  <p className="min-w-0 flex-1 text-meta text-text-secondary">
                    {STATE_META[state].meaning}
                  </p>
                  <span data-numeric className="shrink-0 text-meta text-text-muted">
                    {view.counts[state]} of {view.total}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {groups.map((group) => (
            <section key={group.category}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className="text-card font-semibold text-text-primary">{group.title}</h2>
                <p className="text-meta text-text-muted">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
                {group.rows.map((row) => (
                  <IntegrationCard key={row.integration.id} row={row} />
                ))}
              </div>
            </section>
          ))}

          <Panel
            title="Webhooks and keys"
            description="The endpoints a connected service would call, kept inert."
          >
            <CredentialsPanel integrations={allIntegrations} />
          </Panel>

          <p className="pb-2 text-meta text-text-muted">
            The enquiries, conversations and reservations counted on the demo cards are the same
            seeded records the inbox and the ledger read. They are not a sync history.
          </p>
        </div>
      </div>
    </div>
  );
}

