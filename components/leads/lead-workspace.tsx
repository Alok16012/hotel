"use client";

import * as React from "react";
import { toast } from "sonner";
import { DEMO_NOW } from "@/lib/clock";
import { LEAD_PRIORITY, LEAD_STAGE } from "@/lib/labels";
import type { LeadDetail as LeadDetailModel, LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { Hotel, LeadPriority, LeadStage, Message, TeamMember } from "@/types";
import type { OutgoingMessage } from "./composer";
import { LEAD_VIEWS, filterLeads, type FilterState } from "./filters";
import { LeadDetail } from "./lead-detail";
import { LeadList } from "./lead-list";
import { LeadToolbar } from "./lead-toolbar";
import { TriagePane } from "./triage-pane";

/**
 * The lead workspace (§10-§14).
 *
 * Everything an operator changes here lives in one local patch map keyed by
 * lead id. That is the shape a backend slots into without touching a single
 * component: today `patch()` writes to state, tomorrow it posts and reconciles.
 *
 * Patches are applied over the server-built rows rather than replacing them, so
 * a stage moved in the rail re-sorts the inbox, a reply stops the waiting
 * clock, and the view counts in the toolbar move with the work. Local state
 * that does not feed back into the list is the reason CRMs feel dead.
 */

interface LeadPatch {
  stage?: LeadStage;
  priority?: LeadPriority;
  /** `null` means deliberately unassigned, `undefined` means untouched. */
  ownerId?: string | null;
  read?: boolean;
  actionDone?: boolean;
  /** Messages added in this session, oldest first. */
  messages?: Message[];
  /** Set when a reply left the desk, which is what stops the waiting clocks. */
  answered?: boolean;
}

const INITIAL_FILTERS: FilterState = {
  view: "working",
  query: "",
  sources: [],
  stages: [],
  sort: "urgency",
};

export function LeadWorkspace({
  rows,
  details,
  team,
  currentUser,
  hotel,
}: {
  rows: LeadRow[];
  details: Record<string, LeadDetailModel>;
  team: TeamMember[];
  currentUser: TeamMember;
  hotel: Hotel;
}) {
  const [filters, setFilters] = React.useState<FilterState>(INITIAL_FILTERS);
  const [patches, setPatches] = React.useState<Record<string, LeadPatch>>({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Local timestamps march forward a minute at a time from the demo clock, so
  // a session's replies stay in order and never land before the last real
  // message in the thread.
  const seqRef = React.useRef(0);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const teamById = React.useMemo(
    () => Object.fromEntries(team.map((member) => [member.id, member])),
    [team],
  );

  const patchedRows = React.useMemo(
    () => rows.map((row) => applyPatch(row, patches[row.id], teamById)),
    [rows, patches, teamById],
  );

  const visibleRows = React.useMemo(
    () => filterLeads(patchedRows, filters),
    [patchedRows, filters],
  );

  const selectedRow = patchedRows.find((row) => row.id === selectedId) ?? null;
  const detail = selectedId ? details[selectedId] : undefined;
  const patch = selectedId ? patches[selectedId] : undefined;

  function updatePatch(leadId: string, change: Partial<LeadPatch>) {
    setPatches((prev) => ({ ...prev, [leadId]: { ...prev[leadId], ...change } }));
  }

  /** Restores one lead's patch wholesale. Every undo in here uses it. */
  function restore(leadId: string, snapshot: LeadPatch | undefined) {
    setPatches((prev) => {
      const next = { ...prev };
      if (snapshot === undefined) delete next[leadId];
      else next[leadId] = snapshot;
      return next;
    });
  }

  function select(id: string) {
    setSelectedId(id);
    // Opening a thread is reading it, exactly as every mail client behaves.
    if (!patches[id]?.read) updatePatch(id, { read: true });
  }

  function changeStage(row: LeadRow, stage: LeadStage) {
    if (stage === row.stage) return;
    const snapshot = patches[row.id];
    updatePatch(row.id, { stage });
    toast.success(`${row.reference} moved to ${LEAD_STAGE[stage].label.toLowerCase()}`, {
      description: `${row.guestName} · ${LEAD_STAGE[row.stage].label} before this`,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function changePriority(row: LeadRow, priority: LeadPriority) {
    if (priority === row.priority) return;
    const snapshot = patches[row.id];
    updatePatch(row.id, { priority });
    toast.success(`${row.guestName} set to ${LEAD_PRIORITY[priority].label.toLowerCase()}`, {
      description: "The inbox re-sorts on the next pass through the queue.",
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function assign(row: LeadRow, memberId: string | undefined) {
    const snapshot = patches[row.id];
    updatePatch(row.id, { ownerId: memberId ?? null });
    const member = memberId ? teamById[memberId] : undefined;
    toast.success(
      member ? `${row.reference} assigned to ${member.name}` : `${row.reference} left unassigned`,
      {
        description: member
          ? `${member.role === "owner" ? "Owner" : member.role} · ${member.assignedLeadCount + 1} open enquiries`
          : "It will show in the unassigned view until someone picks it up.",
        action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
      },
    );
  }

  function completeAction(row: LeadRow, done: boolean) {
    updatePatch(row.id, { actionDone: done });
    if (done) {
      toast.success("Next action marked done", { description: row.nextAction });
    }
  }

  function markUnread(row: LeadRow) {
    const snapshot = patches[row.id];
    updatePatch(row.id, { read: false });
    setSelectedId(null);
    toast("Left in the queue", {
      description: `${row.guestName} will show as unread until someone opens it again.`,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function send(row: LeadRow, model: LeadDetailModel, outgoing: OutgoingMessage) {
    const seq = ++seqRef.current;
    const id = `msg_local_${row.id}_${seq}`;
    const isNote = outgoing.mode === "note";
    const snapshot = patches[row.id];

    const message: Message = {
      id,
      conversationId: `conv_local_${row.id}`,
      authorKind: isNote ? "internal_note" : "staff",
      authorId: currentUser.id,
      authorName: currentUser.name,
      body: outgoing.body,
      sentAt: new Date(DEMO_NOW.getTime() + seq * 60_000).toISOString(),
      status: isNote ? "sent" : "sending",
      channel: model.lead.source,
      attachments: outgoing.quote
        ? [
            {
              id: `att_${id}`,
              kind: "quote",
              name: `Quote ${row.reference}.pdf`,
              sizeLabel: "126 KB",
            },
          ]
        : undefined,
    };

    // Sending a quote is what actually moves an enquiry on, so the stage
    // follows the work instead of waiting to be tidied up later.
    const advances =
      !isNote &&
      outgoing.quote !== undefined &&
      (row.stage === "new" || row.stage === "contacted" || row.stage === "qualified");

    updatePatch(row.id, {
      messages: [...(patches[row.id]?.messages ?? []), message],
      answered: isNote ? patches[row.id]?.answered : true,
      read: true,
      ...(advances ? { stage: "quote_sent" as LeadStage } : {}),
    });

    if (isNote) {
      toast("Note saved for the team", {
        description: "Only colleagues can see it. Nothing was sent to the guest.",
        action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
      });
      return;
    }

    // The two-step delivery is the mock transport, labelled as such in the UI
    // by the status line under the bubble rather than by a fake integration.
    timersRef.current.push(
      setTimeout(() => setMessageStatus(row.id, id, "sent"), 700),
      setTimeout(() => setMessageStatus(row.id, id, "delivered"), 1800),
    );

    toast.success(`Reply sent to ${row.guestName}`, {
      description: advances
        ? `Quote attached. ${row.reference} moved to quote sent.`
        : outgoing.assisted
          ? "Sent as drafted, unedited."
          : `On ${model.lead.source === "whatsapp" ? "WhatsApp" : "the same channel it arrived on"}.`,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function setMessageStatus(leadId: string, messageId: string, status: Message["status"]) {
    setPatches((prev) => {
      const current = prev[leadId];
      if (!current?.messages?.some((m) => m.id === messageId)) return prev;
      return {
        ...prev,
        [leadId]: {
          ...current,
          messages: current.messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
        },
      };
    });
  }

  const emptyDescription =
    LEAD_VIEWS.find((view) => view.id === filters.view)?.description ??
    "Nothing matches these filters.";

  return (
    <div className="flex min-h-0 flex-1">
      {/* Inbox. Full width on a phone until something is picked. */}
      <div
        className={cn(
          "w-full shrink-0 flex-col border-hairline bg-canvas lg:flex lg:w-[21rem] lg:border-r xl:w-[23rem]",
          selectedId ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="border-b border-hairline px-3 py-2.5">
          <LeadToolbar
            rows={patchedRows}
            state={filters}
            onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
            resultCount={visibleRows.length}
          />
        </div>

        <LeadList
          rows={visibleRows}
          selectedId={selectedId}
          onSelect={select}
          emptyDescription={emptyDescription}
          className="min-h-0 flex-1"
        />
      </div>

      {selectedRow && detail ? (
        <LeadDetail
          key={selectedRow.id}
          detail={detail}
          row={selectedRow}
          messages={[...detail.messages, ...(patch?.messages ?? [])]}
          stage={selectedRow.stage}
          priority={selectedRow.priority}
          owner={selectedRow.ownerId ? teamById[selectedRow.ownerId] : undefined}
          team={team}
          actionDone={patch?.actionDone ?? false}
          hotelName={hotel.name}
          currentUser={currentUser}
          onBack={() => setSelectedId(null)}
          onSend={(outgoing) => send(selectedRow, detail, outgoing)}
          onStageChange={(stage) => changeStage(selectedRow, stage)}
          onPriorityChange={(priority) => changePriority(selectedRow, priority)}
          onAssign={(memberId) => assign(selectedRow, memberId)}
          onCompleteAction={() => completeAction(selectedRow, !(patch?.actionDone ?? false))}
          onMarkUnread={() => markUnread(selectedRow)}
        />
      ) : (
        <TriagePane rows={patchedRows} onSelect={select} className="hidden lg:block" />
      )}
    </div>
  );
}

/** Row plus whatever this session has changed about it. */
function applyPatch(
  row: LeadRow,
  patch: LeadPatch | undefined,
  teamById: Record<string, TeamMember>,
): LeadRow {
  if (!patch) return row;

  const last = patch.messages?.[patch.messages.length - 1];
  const owner =
    patch.ownerId === null
      ? undefined
      : patch.ownerId
        ? teamById[patch.ownerId]
        : row.ownerId
          ? teamById[row.ownerId]
          : undefined;

  return {
    ...row,
    stage: patch.stage ?? row.stage,
    priority: patch.priority ?? row.priority,
    ownerId: owner?.id,
    ownerName: owner?.name,
    ownerInitials: owner?.avatarInitials,
    unreadCount: patch.read ? 0 : row.unreadCount,
    lastMessagePreview: last
      ? `${last.authorKind === "internal_note" ? "Note: " : "You: "}${last.body.replace(/\s+/g, " ").slice(0, 120)}`
      : row.lastMessagePreview,
    lastActivityAt: last?.sentAt ?? row.lastActivityAt,
    waitingSec: patch.answered ? 0 : row.waitingSec,
    unattendedSec: patch.answered ? 0 : row.unattendedSec,
    isBreaching: patch.answered ? false : row.isBreaching,
    firstResponseSec:
      patch.answered && row.firstResponseSec === undefined
        ? Math.max(row.unattendedSec, 1)
        : row.firstResponseSec,
    hasThread: row.hasThread || (patch.messages?.length ?? 0) > 0,
  };
}
