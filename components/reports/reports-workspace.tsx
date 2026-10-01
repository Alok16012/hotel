"use client";

import * as React from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Panel } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ReportsView } from "@/lib/reports";
import { downloadCsv } from "./model";
import { ReportBrief, ReportLibrary } from "./report-library";
import { ReportSheet } from "./report-sheet";
import { SchedulePanel } from "./schedule-panel";

/**
 * Reports (§22).
 *
 * A library on the left, the selected sheet on the right, and the standing
 * delivery instructions underneath. The sheet is rendered rather than
 * described: a report library whose entries are cards with a download button
 * asks somebody to take a file on trust, and the figures are the only thing
 * that tells them whether the report is worth scheduling.
 *
 * Every period of every report is computed on the server and handed over, so
 * switching period is instant here. Against a real warehouse each switch
 * becomes one query and nothing else on this screen changes.
 */
export function ReportsWorkspace({ view }: { view: ReportsView }) {
  const [selectedId, setSelectedId] = React.useState(view.entries[0].definition.id);
  const [scopeId, setScopeId] = React.useState(view.scopes[0].id);
  const [periodByReport, setPeriodByReport] = React.useState<Record<string, string>>({});

  const entry = view.entries.find((e) => e.definition.id === selectedId) ?? view.entries[0];
  const periodId = periodByReport[entry.definition.id] ?? entry.periods[0].id;
  const report = entry.renders[periodId] ?? entry.renders[entry.periods[0].id];
  const scope = view.scopes.find((s) => s.id === scopeId) ?? view.scopes[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Standing sheets, drawn from the same records the rest of the product reads."
        actions={
          <div className="w-[14rem]">
            <Select
              aria-label="Property these reports cover"
              value={scopeId}
              onChange={(event) => setScopeId(event.target.value)}
            >
              {view.scopes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-3 lg:gap-4">
              <Panel title="Library" description="Five standing reports." bodyClassName="bg-surface-sunken/40">
                <ReportLibrary
                  entries={view.entries}
                  selectedId={entry.definition.id}
                  onSelect={setSelectedId}
                />
              </Panel>

              <Panel title="What this report is for">
                <ReportBrief entry={entry} />
              </Panel>
            </div>

            <Panel
              title="Sheet"
              description={`${entry.definition.name}, scoped to ${scope.name}.`}
              aside={
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    label="Period this report covers"
                    options={entry.periods}
                    value={periodId}
                    onChange={(next) =>
                      setPeriodByReport((current) => ({
                        ...current,
                        [entry.definition.id]: next,
                      }))
                    }
                  />

                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={!scope.hasRecords}
                    onClick={() => {
                      downloadCsv(report);
                      toast("Export started", {
                        description:
                          "Built in this tab from the figures on screen. Nothing left the browser.",
                      });
                    }}
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    CSV
                  </Button>

                  <Button
                    size="xs"
                    variant="subtle"
                    disabled
                    title="A branded PDF is rendered on a server, which this build does not have."
                  >
                    <FileText className="size-3.5" aria-hidden="true" />
                    PDF
                  </Button>
                </div>
              }
              bodyClassName="min-h-0"
            >
              {scope.hasRecords ? (
                <ReportSheet report={report} />
              ) : (
                <div className="px-4 py-6">
                  <p className="text-body font-medium text-text-primary">
                    No records have been seeded for {scope.name}.
                  </p>
                  <p className="mt-1 max-w-[42rem] text-meta text-text-secondary">
                    The enquiries, reservations and conversations in this build all belong to{" "}
                    {view.property}. The library and the delivery schedule are shared across
                    properties, so switching back shows the same five sheets with figures behind
                    them.
                  </p>
                </div>
              )}
            </Panel>
          </div>

          <Panel
            title="Scheduled delivery"
            description="Who receives which sheet, and when."
            footer={
              <p className="text-micro text-text-muted">
                Changes here are held for this session. Delivery needs a mail or messaging service,
                and none is connected in this build.
              </p>
            }
          >
            <SchedulePanel
              schedules={view.schedules}
              definitions={view.entries.map((e) => e.definition)}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

