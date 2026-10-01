/**
 * The property's configuration, with the evidence beside it (§37, §42).
 *
 * A settings screen that only shows what somebody typed is a form. What makes
 * this one worth reading is the second column: each response target is joined
 * to what the desk actually did on that channel, so a target is read against
 * its own record rather than admired on its own. A fifteen-minute undertaking
 * that the desk misses two thirds of the time is a decision to revisit, and
 * the screen should say so where the decision is made.
 *
 * The measured figures come from the same `LEADS` array the dashboard and the
 * reports read, so a target marked as met here cannot disagree with the SLA
 * report.
 */

import { AUTONOMY_RATE, DESK_ACTIONS_TODAY } from "@/data/events";
import { HOTEL, PROPERTIES } from "@/data/hotel";
import { LEADS } from "@/data/leads";
import { CANCELLATION_POLICY, STAY_POLICY } from "@/data/policies";
import {
  AUTOMATION_RULES,
  CONTACT_CHANNELS,
  ESCALATION_RULES,
  RESPONSE_TARGETS,
} from "@/data/settings";
import { TEAM } from "@/data/team";
import type {
  AutomationRule,
  CancellationPolicy,
  ContactChannel,
  EscalationRule,
  Hotel,
  ResponseTarget,
  StayPolicy,
  TeamMember,
} from "@/types";

/** A contact channel with the traffic it has actually carried. */
export interface ContactChannelRow {
  channel: ContactChannel;
  /** Seeded enquiries that arrived here. */
  leadCount: number;
  /** The person who owns it today, where the roster names one. */
  owner?: TeamMember;
}

/** A response target and the record it is judged against. */
export interface ResponseTargetRow {
  target: ResponseTarget;
  /** Enquiries on this channel that have had a first reply. */
  answered: number;
  /** Enquiries still waiting, excluded from the median rather than counted as fast. */
  waiting: number;
  /**
   * Every measured first reply, in seconds.
   *
   * Carried through rather than reduced to a compliance figure on the server,
   * because the target is adjustable on the screen and a share computed
   * against the old one would sit there contradicting the row it is in.
   */
  responseTimes: number[];
  /** Median first reply in seconds, or undefined when nothing has been answered. */
  medianSec?: number;
  /** Share of answered enquiries inside the target, as a fraction. */
  compliance?: number;
  /** True when the measured median sits inside the undertaking. */
  meetingTarget: boolean;
}

export interface SettingsView {
  property: Hotel;
  properties: Hotel[];
  stay: StayPolicy;
  cancellation: CancellationPolicy;
  contacts: ContactChannelRow[];
  /** Channels a guest can use that this build does not read. */
  unwatchedCount: number;
  /**
   * The rules as seeded.
   *
   * How many are automatic and how many are reserved for a person is not
   * counted here, and neither is the number of targets being missed. Both are
   * adjustable on the screen, and a summary computed on the server would sit
   * above a table it stopped describing the moment anything was touched.
   */
  automation: AutomationRule[];
  autonomyRate: number;
  deskActionsToday: number;
  targets: ResponseTargetRow[];
  escalations: EscalationRule[];
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/**
 * Who answers for a channel.
 *
 * The seed names a role rather than a person, because that is how a property
 * writes it down: the desk owns the switchboard whoever is standing at it. The
 * roster is consulted to put a face against the role, and where two people
 * share it the first on the roster is shown rather than inventing a hierarchy.
 */
function ownerFor(channel: ContactChannel): TeamMember | undefined {
  return TEAM.find((member) => member.role === channel.ownerRole);
}

export function getSettingsView(): SettingsView {
  const contacts: ContactChannelRow[] = CONTACT_CHANNELS.map((channel) => ({
    channel,
    leadCount: LEADS.filter((lead) => lead.source === channel.source).length,
    owner: ownerFor(channel),
  }));

  const targets: ResponseTargetRow[] = RESPONSE_TARGETS.map((target) => {
    const rows = LEADS.filter((lead) => lead.source === target.source);
    const replied = rows.filter((lead) => typeof lead.firstResponseSec === "number");
    const times = replied.map((lead) => lead.firstResponseSec as number);
    const medianSec = median(times);
    const inside = times.filter((sec) => sec <= target.targetSec).length;

    return {
      target,
      answered: replied.length,
      waiting: rows.length - replied.length,
      responseTimes: times,
      medianSec,
      compliance: times.length ? inside / times.length : undefined,
      // An unmeasured channel is not a failing one. Absence of evidence is
      // shown as absence, not as a breach.
      meetingTarget: medianSec === undefined ? true : medianSec <= target.targetSec,
    };
  });

  return {
    property: HOTEL,
    properties: PROPERTIES,
    stay: STAY_POLICY,
    cancellation: CANCELLATION_POLICY,
    contacts,
    unwatchedCount: CONTACT_CHANNELS.filter((channel) => !channel.reachesInbox).length,
    automation: AUTOMATION_RULES,
    autonomyRate: AUTONOMY_RATE,
    deskActionsToday: DESK_ACTIONS_TODAY.length,
    targets,
    escalations: ESCALATION_RULES,
  };
}
