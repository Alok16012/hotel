"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Panel } from "@/components/common/panel";
import { CHASE_RULE_ID, chaseHandoverCopy } from "@/lib/automation";
import { formatDuration, formatPct } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { ResponseTargetRow, SettingsView } from "@/lib/settings";
import type { AutomationMode, AutomationRule } from "@/types";
import { applyModeOverrides, applyTargetOverrides, AUTOMATION_MODE_META } from "./model";
import { AutomationLegend, AutomationPanel } from "./automation-panel";
import { EscalationPanel } from "./escalation-panel";
import { CancellationPanel, StayPolicyPanel } from "./policy-panel";
import { ContactChannelTable, PropertyPanel } from "./property-panel";
import { SETTINGS_SECTIONS } from "./model";
import { TargetsPanel } from "./targets-panel";

/**
 * Settings (§37, §42).
 *
 * Ordered by how often an owner actually opens it, which is the reverse of how
 * settings screens are usually built: the property record at the top is read
 * once a year, and the automation rules below it are the reason somebody came.
 * The order holds anyway, because the policies have to be established before
 * the rules that enforce them make sense.
 *
 * Nothing on this screen writes. The controls move, the page reflects it, and
 * the toast says how far that goes rather than implying a save.
 */
export function SettingsWorkspace({ view }: { view: SettingsView }) {
  const second = view.properties.find((property) => property.id !== view.property.id);

  /**
   * The adjustable tables are laid over the seed from the session store rather
   * than copied into this component's state.
   *
   * Two reasons. The figures at the top of the page are counted from the same
   * derivation as the tables below, so a summary cannot drift from what it is
   * summarising. And the follow-up queue reads the automation modes too: a
   * decision made here about who answers a quiet quote has to be the same
   * decision that queue enforces, which it cannot be while it lives in one
   * screen's `useState`.
   */
  const automationModes = useSession((s) => s.automationModes);
  const responseTargets = useSession((s) => s.responseTargets);
  const setAutomationMode = useSession((s) => s.setAutomationMode);
  const setResponseTarget = useSession((s) => s.setResponseTarget);

  const automation = React.useMemo(
    () => applyModeOverrides(view.automation, automationModes),
    [view.automation, automationModes],
  );
  const targets = React.useMemo(
    () => applyTargetOverrides(view.targets, responseTargets),
    [view.targets, responseTargets],
  );

  const autoSendCount = automation.filter((rule) => rule.mode === "send").length;
  const humanOnlyCount = automation.filter((rule) => rule.mode === "human").length;
  const targetsMissed = targets.filter((row) => !row.meetingTarget).length;

  function setMode(rule: AutomationRule, mode: AutomationMode) {
    if (rule.mode === mode) return;
    setAutomationMode(rule.id, mode);
    toast(`${rule.label}: ${AUTOMATION_MODE_META[mode].label.toLowerCase()}`, {
      // The chase rule is the one that changes something a person can go and
      // see, so its toast says where. The rest only move this page.
      description:
        rule.id === CHASE_RULE_ID
          ? `Held for this session. ${chaseHandoverCopy(mode)}`
          : "Held for this session. No automation runs in this build.",
    });
  }

  function setTarget(row: ResponseTargetRow, targetSec: number) {
    setResponseTarget(row.target.id, targetSec);
    toast(
      `${LEAD_SOURCE[row.target.source].label} target set to ${formatDuration(targetSec)}`,
      { description: "Held for this session. Past enquiries are re-scored, nothing is re-timed." },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Settings"
        description="What this property has decided, and what those decisions have produced."
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:gap-4">
          <Panel
            title="Changes here last as long as this tab does"
            description="No settings service is connected in this build, so every control below moves the page and nothing else."
            aside={<JumpRail />}
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 px-4 py-3 sm:grid-cols-3">
              <Figure
                value={`${autoSendCount} of ${automation.length}`}
                label="enquiry types answered without a person"
                hint={`${humanOnlyCount} are left for a person entirely`}
              />
              <Figure
                value={formatPct(view.autonomyRate, 0)}
                label="of today's desk actions finished on their own"
                hint={`counted across ${view.deskActionsToday} actions`}
              />
              <Figure
                value={targetsMissed ? `${targetsMissed} of ${targets.length}` : "None"}
                label={
                  targetsMissed
                    ? "response targets the desk is missing"
                    : "response targets are being missed"
                }
                hint="measured against the seeded enquiries on each channel"
                tone={targetsMissed ? "critical" : "default"}
              />
            </div>
          </Panel>

          <Section id="property" title="Property">
            <Panel
              title={view.property.name}
              description="The registered record every quote, folio and tax figure is drawn against."
            >
              <PropertyPanel property={view.property} second={second} />
            </Panel>
          </Section>

          <Section id="channels" title="Contact channels">
            <Panel
              title="How guests reach the property"
              description={
                view.unwatchedCount
                  ? `${view.unwatchedCount} of these do not feed the inbox in this build and are watched by hand.`
                  : "Every channel below feeds the inbox."
              }
            >
              <ContactChannelTable rows={view.contacts} />
            </Panel>
          </Section>

          <Section id="policies" title="Policies">
            <div className="grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-2">
              <Panel
                title="Cancellation"
                description="The ladder a refund is quoted from, and the one the booking screen computes against."
              >
                <CancellationPanel policy={view.cancellation} />
              </Panel>
              <Panel
                title="Arrival, departure and children"
                description="The answers the desk gives most often, kept in one place so they are given the same way."
              >
                <StayPolicyPanel policy={view.stay} />
              </Panel>
            </div>
          </Section>

          <Section id="automation" title="Automation">
            <div className="flex flex-col gap-3 lg:gap-4">
              <Panel
                title="What the three settings mean"
                description="The difference between them is who is answerable for what reaches a guest, not how quickly it gets there."
              >
                <AutomationLegend />
              </Panel>
              <Panel
                title="Which enquiries may be answered without a person"
                description="Each row carries a real message, because that is what the decision is actually about."
                footer={
                  <p className="text-micro text-text-muted">
                    Who may approve a discount, take a payment or change a rate is a separate
                    question, settled by role.{" "}
                    <Link
                      href="/team"
                      className="inline-flex items-center gap-1 font-medium text-text-secondary transition-colors duration-[var(--duration-micro)] hover:text-brand-700"
                    >
                      Permissions and approval thresholds
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </p>
                }
              >
                <AutomationPanel rules={automation} onSetMode={setMode} />
              </Panel>
            </div>
          </Section>

          <Section id="targets" title="Response targets">
            <Panel
              title="What the property undertakes on each channel"
              description="Shown beside what the desk has actually done, so a target is read against its own record."
            >
              <TargetsPanel rows={targets} onSetTarget={setTarget} />
            </Panel>
          </Section>

          <Section id="escalations" title="Escalation">
            <Panel
              title="When somebody gets interrupted"
              description="Rules that are switched off stay listed. Deciding not to be told is a decision worth seeing."
            >
              <EscalationPanel rules={view.escalations} />
            </Panel>
          </Section>

          <p className="pb-2 text-meta text-text-muted">
            The medians, compliance shares and autonomy figure on this screen are computed from the
            same seeded records the dashboard and the reports read. They are not a settings history.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section heading and anchor.
 *
 * The heading is visible rather than implied by the panel title, because six
 * panels of equal weight down a long scroll are hard to navigate by eye and
 * the jump rail needs something to land on.
 */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 text-meta font-semibold uppercase tracking-[0.06em] text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Anchors down the page. Hidden below lg, where the scroll is short enough. */
function JumpRail() {
  return (
    <nav aria-label="Settings sections" className="hidden items-center gap-1 lg:flex">
      {SETTINGS_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="rounded-[var(--radius-sm)] px-1.5 py-0.5 text-micro text-text-muted transition-colors duration-[var(--duration-micro)] hover:bg-surface-sunken hover:text-text-primary"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

function Figure({
  value,
  label,
  hint,
  tone = "default",
}: {
  value: string;
  label: string;
  hint: string;
  tone?: "default" | "critical";
}) {
  return (
    <div className="border-b border-hairline py-1.5 last:border-0 sm:border-0 sm:py-0">
      <p
        data-numeric
        className={
          tone === "critical"
            ? "text-section font-semibold text-critical-700"
            : "text-section font-semibold text-text-primary"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-meta text-text-secondary">{label}</p>
      <p className="mt-0.5 text-micro text-text-muted">{hint}</p>
    </div>
  );
}
