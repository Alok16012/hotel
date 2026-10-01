/**
 * Wording for the three connection states.
 *
 * Client-safe: `lib/integrations.ts` reads the seed, so the workspace takes
 * types from it and the labels from here.
 *
 * The copy is deliberately blunt. A status chip that says "Demo" and nothing
 * else invites the reading that a real connection is one switch away, so each
 * state carries a sentence that says what is and is not happening.
 */

import type { IntegrationState } from "@/types";

export interface StateMeta {
  label: string;
  /** One line, shown in the legend. */
  meaning: string;
  intent: "intel" | "neutral" | "positive";
}

export const STATE_META: Record<IntegrationState, StateMeta> = {
  demo: {
    label: "Demo",
    meaning:
      "Seeded records stand in for the service. The product reads them exactly as it would read the real thing, and nothing leaves this browser.",
    intent: "intel",
  },
  not_connected: {
    label: "Not connected",
    meaning:
      "No account, no credential and no substitute. The card describes what the connection would do so the gap is visible rather than implied.",
    intent: "neutral",
  },
  connected: {
    label: "Connected",
    meaning:
      "A live service is answering, with a last sync time and any error it returned. Nothing in this build is in this state.",
    intent: "positive",
  },
};

export const DIRECTION_LABEL: Record<"in" | "out" | "both", string> = {
  in: "Receives",
  out: "Sends",
  both: "Two way",
};

export type IntegrationFilter = "all" | IntegrationState;

export const INTEGRATION_FILTERS: readonly { id: IntegrationFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "demo", label: "Demo" },
  { id: "not_connected", label: "Not connected" },
];
