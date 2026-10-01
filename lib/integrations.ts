/**
 * The connections screen, derived rather than declared (§41).
 *
 * A status label on its own is cheap. What makes the distinction between demo
 * and not connected legible is the evidence beside it, so a channel marked
 * `demo` carries the number of seeded records it accounts for and how recently
 * the newest one arrived. Those figures come from the same arrays every other
 * screen reads, which means a card cannot claim activity the inbox does not
 * have.
 *
 * Nothing here performs a request, tests a credential or measures a real sync.
 * `lastRecordAt` is the age of a seeded record, and it is labelled as such
 * everywhere it is shown.
 */

import { BOOKINGS } from "@/data/bookings";
import { CONVERSATIONS } from "@/data/conversations";
import { INTEGRATIONS } from "@/data/integrations";
import { LEADS } from "@/data/leads";
import type { Integration, IntegrationCategory, IntegrationState, ISODateTime } from "@/types";

export interface IntegrationRow {
  integration: Integration;
  /** Seeded enquiries attributed to this channel, for channels only. */
  leadCount: number;
  /** Seeded conversation threads on this channel. */
  threadCount: number;
  /** Seeded reservations that arrived through it. */
  bookingCount: number;
  /** Newest seeded record on the channel, so the card can age it. */
  lastRecordAt?: ISODateTime;
}

export interface IntegrationGroup {
  category: IntegrationCategory;
  title: string;
  /** Why these belong together, in one line. */
  description: string;
  rows: IntegrationRow[];
}

export interface IntegrationsView {
  groups: IntegrationGroup[];
  counts: Record<IntegrationState, number>;
  total: number;
  /** Seeded enquiries the demo channels account for between them. */
  demoRecordCount: number;
}

const GROUP_META: Record<IntegrationCategory, { title: string; description: string }> = {
  channel: {
    title: "Enquiry channels",
    description: "Where guests start a conversation. These feed the inbox directly.",
  },
  commerce: {
    title: "Money",
    description: "Collection and reconciliation. Nothing in this build moves a rupee.",
  },
  operations: {
    title: "Operations",
    description: "Inventory, the in-house system of record, and what the law requires.",
  },
  platform: {
    title: "Platform",
    description: "The services this application would run on rather than talk to.",
  },
};

const CATEGORY_ORDER: IntegrationCategory[] = ["channel", "commerce", "operations", "platform"];

function newest(dates: ISODateTime[]): ISODateTime | undefined {
  if (dates.length === 0) return undefined;
  return dates.reduce((latest, current) => (current > latest ? current : latest));
}

function toRow(integration: Integration): IntegrationRow {
  const { source } = integration;
  if (!source) {
    return { integration, leadCount: 0, threadCount: 0, bookingCount: 0 };
  }

  const leads = LEADS.filter((lead) => lead.source === source);
  const threads = CONVERSATIONS.filter((conversation) => conversation.channel === source);

  return {
    integration,
    leadCount: leads.length,
    threadCount: threads.length,
    bookingCount: BOOKINGS.filter((booking) => booking.source === source).length,
    lastRecordAt: newest(leads.map((lead) => lead.lastActivityAt)),
  };
}

export function getIntegrationsView(): IntegrationsView {
  const rows = INTEGRATIONS.map(toRow);

  const counts: Record<IntegrationState, number> = {
    demo: 0,
    not_connected: 0,
    connected: 0,
  };
  for (const row of rows) counts[row.integration.state] += 1;

  return {
    groups: CATEGORY_ORDER.map((category) => ({
      category,
      ...GROUP_META[category],
      rows: rows.filter((row) => row.integration.category === category),
    })).filter((group) => group.rows.length > 0),
    counts,
    total: rows.length,
    demoRecordCount: rows.reduce(
      (total, row) => total + (row.integration.state === "demo" ? row.leadCount : 0),
      0,
    ),
  };
}
