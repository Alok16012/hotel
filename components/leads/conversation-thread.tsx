"use client";

import * as React from "react";
import { Check, CheckCheck, Clock, FileText, Image as ImageIcon, Lock, MessageSquareOff, Receipt, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar, toneForName } from "@/components/ui/avatar";
import { demoDayOf, isDemoToday } from "@/lib/clock";
import { formatFullDate, formatTime } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import { cn, initials } from "@/lib/utils";
import type { Message, MessageAttachment } from "@/types";

/**
 * The transcript (§13).
 *
 * Three things are kept visually distinct because confusing any two of them
 * costs a hotel money: what the guest said, what a colleague sent, and what the
 * automation sent on the desk's behalf. Internal notes are a fourth class
 * again, drawn as an aside rather than a bubble, because a note that looks like
 * a message is a note that eventually gets sent to a guest.
 */
export function ConversationThread({
  messages,
  channel,
  guestName,
  className,
}: {
  messages: Message[];
  channel: string;
  guestName: string;
  className?: string;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  const count = messages.length;

  // Open at the newest message, the way every messaging client does. Jumping
  // to the top would make the operator scroll through history to find the
  // sentence they are about to answer.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, guestName]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <EmptyState
          icon={MessageSquareOff}
          title="No thread on this channel"
          description={`This enquiry reached the desk over ${channel.toLowerCase()} and was logged by hand. Replying here starts the thread.`}
        />
      </div>
    );
  }

  return (
    <div className={cn("scrollbar-slim px-4 py-4", className)}>
      <ol className="space-y-3">
        {messages.map((message, index) => {
          // A date only earns a line of its own when the message before it
          // belongs to a different day at the property. Slicing the ISO string
          // would bucket by UTC and file everything before 05:30 IST under
          // yesterday, which puts the separator in the wrong place.
          const previous = messages[index - 1];
          const showDay = !previous || demoDayOf(message.sentAt) !== demoDayOf(previous.sentAt);

          return (
            <li key={message.id}>
              {showDay ? <DaySeparator iso={message.sentAt} /> : null}
              <MessageBubble message={message} guestName={guestName} />
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />
    </div>
  );
}

function DaySeparator({ iso }: { iso: string }) {
  const today = isDemoToday(iso);
  return (
    <div className="my-3 flex items-center gap-2 first:mt-0">
      <span className="h-px flex-1 bg-hairline" />
      <span data-numeric className="text-micro text-text-muted">
        {today ? "Today" : formatFullDate(iso)}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

function MessageBubble({ message, guestName }: { message: Message; guestName: string }) {
  if (message.authorKind === "system") {
    return (
      <p
        data-numeric
        className="mx-auto max-w-[46ch] text-center text-micro leading-relaxed text-text-muted"
      >
        {message.body}
      </p>
    );
  }

  if (message.authorKind === "internal_note") {
    return (
      <div className="rounded-[var(--radius-card)] border border-caution-500/25 bg-caution-100/45 px-3 py-2">
        <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-caution-700">
          <Lock className="size-3" aria-hidden="true" />
          Internal note · {message.authorName}
          <span className="ml-auto font-normal normal-case tracking-normal text-text-muted">
            {formatTime(message.sentAt)}
          </span>
        </p>
        <p className="mt-1 text-body leading-relaxed text-text-secondary">{message.body}</p>
        <p className="mt-1 text-micro text-text-muted">The guest does not see this.</p>
      </div>
    );
  }

  const fromGuest = message.authorKind === "guest";
  const name = fromGuest ? guestName : message.authorName;

  return (
    <div className={cn("flex gap-2", fromGuest ? "justify-start" : "justify-end")}>
      {fromGuest ? (
        <Avatar size="sm" initials={initials(name)} tone={toneForName(name)} className="mt-4" />
      ) : null}

      <div className={cn("min-w-0 max-w-[min(46ch,85%)]")}>
        <div
          className={cn(
            "flex items-baseline gap-1.5 px-0.5 pb-1",
            fromGuest ? "justify-start" : "justify-end",
          )}
        >
          <span className="truncate text-micro font-medium text-text-secondary">{name}</span>
          {message.isAutomated ? (
            /* The one label that is never allowed to be subtle (§20). */
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-micro)] bg-intel-100 px-1 text-micro font-medium text-intel-700">
              <Sparkles className="size-2.5" aria-hidden="true" />
              Sent automatically
            </span>
          ) : null}
          <span data-numeric className="shrink-0 text-micro text-text-muted">
            {formatTime(message.sentAt)}
          </span>
        </div>

        <div
          className={cn(
            "rounded-[var(--radius-card)] px-3 py-2 text-body leading-relaxed shadow-[var(--shadow-hairline)]",
            fromGuest
              ? "rounded-tl-[var(--radius-micro)] bg-surface text-text-primary"
              : message.isAutomated
                ? "rounded-tr-[var(--radius-micro)] bg-intel-100/60 text-text-primary"
                : "rounded-tr-[var(--radius-micro)] bg-brand-50 text-text-primary",
          )}
        >
          <p className="whitespace-pre-line">{message.body}</p>

          {message.attachments?.length ? (
            <ul className="mt-2 space-y-1">
              {message.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <Attachment attachment={attachment} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {!fromGuest ? (
          <p className="flex items-center justify-end gap-1 px-0.5 pt-1 text-micro text-text-muted">
            <DeliveryIcon status={message.status} />
            {DELIVERY_LABEL[message.status]}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const DELIVERY_LABEL: Record<Message["status"], string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};

function DeliveryIcon({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Clock className="size-2.5" aria-hidden="true" />;
  if (status === "read")
    return <CheckCheck className="size-2.5 text-accent-600" aria-hidden="true" />;
  if (status === "delivered") return <CheckCheck className="size-2.5" aria-hidden="true" />;
  return <Check className="size-2.5" aria-hidden="true" />;
}

const ATTACHMENT_ICON = {
  image: ImageIcon,
  document: FileText,
  quote: Receipt,
} as const;

function Attachment({ attachment }: { attachment: MessageAttachment }) {
  const Icon = ATTACHMENT_ICON[attachment.kind];
  return (
    <span className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-surface-sunken px-2 py-1.5 shadow-[var(--shadow-hairline)]">
      <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-meta text-text-primary">{attachment.name}</span>
      {attachment.sizeLabel ? (
        <span data-numeric className="shrink-0 text-micro text-text-muted">
          {attachment.sizeLabel}
        </span>
      ) : null}
    </span>
  );
}

/** Channel name for the empty state, kept next to the thread that uses it. */
export function channelLabel(source: keyof typeof LEAD_SOURCE): string {
  return LEAD_SOURCE[source].label;
}
