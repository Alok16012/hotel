"use client";

import * as React from "react";
import { ArrowLeft, MoreHorizontal, Phone, Repeat2 } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, toneForName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import type { LeadDetail as LeadDetailModel, LeadRow } from "@/lib/leads";
import { cn, initials } from "@/lib/utils";
import type { LeadPriority, LeadStage, Message, TeamMember } from "@/types";
import { Composer, type OutgoingMessage } from "./composer";
import { ConversationThread } from "./conversation-thread";
import { LeadContextRail } from "./lead-context-rail";

/**
 * The detail pane (§12-§14).
 *
 * Desktop puts the conversation and the record side by side, because the whole
 * point of the workspace is that answering a guest never requires leaving the
 * sentence you are answering. Below the extra-large breakpoint there is no room
 * for both, so the two become tabs rather than a stack: a rail pushed under a
 * long transcript is a rail nobody reads.
 *
 * The switch is pure CSS at the large end, so there is no media query in
 * JavaScript and nothing to mismatch between server and client render.
 */
export function LeadDetail({
  detail,
  row,
  messages,
  stage,
  priority,
  owner,
  team,
  actionDone,
  hotelName,
  currentUser,
  onBack,
  onSend,
  onStageChange,
  onPriorityChange,
  onAssign,
  onCompleteAction,
  onMarkUnread,
}: {
  detail: LeadDetailModel;
  row: LeadRow;
  messages: Message[];
  stage: LeadStage;
  priority: LeadPriority;
  owner?: TeamMember;
  team: TeamMember[];
  actionDone: boolean;
  hotelName: string;
  currentUser: TeamMember;
  onBack: () => void;
  onSend: (message: OutgoingMessage) => void;
  onStageChange: (stage: LeadStage) => void;
  onPriorityChange: (priority: LeadPriority) => void;
  onAssign: (memberId: string | undefined) => void;
  onCompleteAction: () => void;
  onMarkUnread: () => void;
}) {
  const [tab, setTab] = React.useState<"conversation" | "details">("conversation");
  const { lead, guest } = detail;

  // A different enquiry always opens on its conversation, whatever tab the
  // previous one was left on. Adjusting during render rather than in an effect
  // keeps the correct tab in the first paint instead of flashing the old one.
  const [tabbedLeadId, setTabbedLeadId] = React.useState(lead.id);
  if (tabbedLeadId !== lead.id) {
    setTabbedLeadId(lead.id);
    setTab("conversation");
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col" aria-label={`Enquiry from ${guest.name}`}>
      <header className="border-b border-hairline bg-canvas px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Back to the enquiry list"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>

          <Avatar
            size="md"
            initials={initials(guest.name)}
            tone={toneForName(guest.name)}
            className="hidden sm:inline-grid"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-card font-semibold text-text-primary">{guest.name}</h2>
              {row.isReturningGuest ? (
                <span className="flex shrink-0 items-center gap-1 text-micro text-accent-700">
                  <Repeat2 className="size-3" aria-hidden="true" />
                  Returning
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <SourceBadge source={lead.source} />
              <StatusBadge kind="leadStage" value={stage} />
              {priority === "urgent" || priority === "high" ? (
                <StatusBadge kind="leadPriority" value={priority} />
              ) : null}
              <span data-numeric className="text-micro text-text-muted">
                {lead.reference}
              </span>
              {row.isBreaching ? (
                <span data-numeric className="text-micro font-medium text-critical-700">
                  Unanswered {formatDuration(row.unattendedSec)}
                </span>
              ) : row.waitingSec > 0 ? (
                <span data-numeric className="text-micro text-caution-700">
                  Waiting {formatDuration(row.waitingSec)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${guest.phone.replace(/\s+/g, "")}`}>
                <Phone aria-hidden="true" />
                <span className="hidden sm:inline">Call</span>
              </a>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuLabel>{lead.reference}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={onMarkUnread}>Mark unread</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStageChange("booked")}>
                  Mark as booked
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onStageChange("lost")}>
                  Mark as lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs exist only where the rail cannot sit beside the thread. */}
        <div className="mt-2 flex gap-1 xl:hidden">
          <TabButton
            active={tab === "conversation"}
            label="Conversation"
            onClick={() => setTab("conversation")}
          />
          <TabButton
            active={tab === "details"}
            label="Enquiry details"
            onClick={() => setTab("details")}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            tab === "conversation" ? "flex" : "hidden xl:flex",
          )}
        >
          <ConversationThread
            messages={messages}
            channel={LEAD_SOURCE[lead.source].label}
            guestName={guest.name}
            className="min-h-0 flex-1 overflow-y-auto"
          />
          <Composer
            key={lead.id}
            detail={detail}
            ownerName={owner?.name ?? currentUser.name}
            hotelName={hotelName}
            onSend={onSend}
          />
        </div>

        <aside
          aria-label="Enquiry details"
          className={cn(
            "w-full shrink-0 overflow-y-auto border-hairline bg-canvas",
            "xl:block xl:w-[19.5rem] xl:border-l 2xl:w-[21rem]",
            tab === "details" ? "block" : "hidden",
          )}
        >
          <LeadContextRail
            detail={detail}
            stage={stage}
            priority={priority}
            owner={owner}
            team={team}
            actionDone={actionDone}
            onStageChange={onStageChange}
            onPriorityChange={onPriorityChange}
            onAssign={onAssign}
            onCompleteAction={onCompleteAction}
          />
        </aside>
      </div>
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[var(--radius-control)] px-2.5 py-1 text-meta",
        "transition-colors duration-[80ms]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        active
          ? "bg-ink-900 font-medium text-text-onDark"
          : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
