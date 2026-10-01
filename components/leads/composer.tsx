"use client";

import * as React from "react";
import {
  CornerDownLeft,
  Lock,
  MessageSquare,
  Receipt,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { formatINR } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import { draftReply, type AssistDraft } from "@/lib/lead-assist";
import type { LeadDetail } from "@/lib/leads";
import { MEAL_PLAN_INCLUSION } from "@/lib/quote";
import { cn } from "@/lib/utils";
import { QuoteBuilder, type QuoteResult } from "./quote-builder";

/**
 * The composer (§13, §14, §20).
 *
 * Two modes share one box because a desk switches between them constantly, and
 * the mode is the loudest thing in the control: an internal note is tinted,
 * padlocked and says who can see it, because the failure here is sending a note
 * about a guest to that guest.
 *
 * The assistant writes into the same box rather than into a preview pane. The
 * draft arrives as ordinary editable text the operator owns, with the record it
 * was built from listed beside it and anything it could not settle raised as a
 * caveat. Nothing sends itself.
 */

export type ComposerMode = "reply" | "note";

export interface OutgoingMessage {
  body: string;
  mode: ComposerMode;
  quote?: QuoteResult;
  /** True when the text left the box exactly as the assistant wrote it. */
  assisted: boolean;
}

export function Composer({
  detail,
  ownerName,
  hotelName,
  onSend,
  className,
}: {
  detail: LeadDetail;
  ownerName: string;
  hotelName: string;
  onSend: (message: OutgoingMessage) => void;
  className?: string;
}) {
  const [mode, setMode] = React.useState<ComposerMode>("reply");
  const [body, setBody] = React.useState("");
  const [draft, setDraft] = React.useState<AssistDraft | null>(null);
  const [quote, setQuote] = React.useState<QuoteResult | null>(null);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Moving to another enquiry must not carry half a sentence about the last
  // guest into the next one's thread. The detail pane keys this component on
  // the enquiry, so every field above starts empty for each new one.
  const channel = LEAD_SOURCE[detail.lead.source].label;
  const assisted = draft !== null && draft.body === body;

  function writeDraft() {
    const next = draftReply({
      lead: detail.lead,
      guest: detail.guest,
      roomType: detail.roomType,
      roomsAvailable: detail.roomsAvailable,
      nightlyRate: quote?.nightlyRate ?? detail.suggestedRate,
      ownerName,
      hotelName,
    });
    setDraft(next);
    setBody(next.body);
    setMode("reply");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function attachQuote(result: QuoteResult) {
    setQuote(result);
    setQuoteOpen(false);
    setMode("reply");
    setBody((current) => {
      const paragraph = quoteParagraph(result);
      return current.trim().length === 0 ? paragraph : `${current.trimEnd()}\n\n${paragraph}`;
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function send() {
    if (body.trim().length === 0) return;
    onSend({ body: body.trim(), mode, quote: quote ?? undefined, assisted });
    setBody("");
    setDraft(null);
    setQuote(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      send();
    }
  }

  return (
    <div
      className={cn(
        "border-t border-hairline bg-surface px-3 py-2.5",
        mode === "note" && "bg-caution-100/30",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ModeTab
          active={mode === "reply"}
          icon={MessageSquare}
          label={`Reply on ${channel}`}
          onClick={() => setMode("reply")}
        />
        <ModeTab
          active={mode === "note"}
          icon={Lock}
          label="Internal note"
          onClick={() => setMode("note")}
        />

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={writeDraft}>
            <Sparkles aria-hidden="true" />
            {draft ? "Redraft" : "Draft with AI"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setQuoteOpen(true)}>
            <Receipt aria-hidden="true" />
            {quote ? "Edit quote" : "Attach quote"}
          </Button>
        </div>
      </div>

      {draft ? (
        <AssistPanel
          draft={draft}
          edited={draft.body !== body}
          onDiscard={() => {
            setDraft(null);
            if (draft.body === body) setBody("");
          }}
        />
      ) : null}

      {quote ? (
        <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-card)] bg-surface-sunken px-2.5 py-1.5 shadow-[var(--shadow-hairline)]">
          <Receipt className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
          <p data-numeric className="min-w-0 flex-1 truncate text-meta text-text-primary">
            {quote.roomTypeName} · {quote.rooms} × {quote.nights}N ·{" "}
            {formatINR(quote.nightlyRate)} a night · {formatINR(quote.total)} total
          </p>
          {quote.needsApproval ? (
            <span className="shrink-0 text-micro font-medium text-critical-700">
              Needs approval
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove the attached quote"
            onClick={() => setQuote(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <Textarea
        ref={textareaRef}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={mode === "note" ? "Internal note" : `Reply on ${channel}`}
        placeholder={
          mode === "note"
            ? "Note for the team. The guest never sees this."
            : `Write to ${detail.guest.name.split(" ")[0]} on ${channel}`
        }
        className={cn("max-h-48 min-h-16", mode === "note" && "border-caution-500/40 bg-surface")}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-micro text-text-muted">
          {mode === "note" ? (
            "Visible to the team only. Nothing leaves the property."
          ) : (
            <>
              <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to send
            </>
          )}
        </p>
        <Button
          variant={mode === "note" ? "secondary" : "primary"}
          size="sm"
          disabled={body.trim().length === 0}
          onClick={send}
        >
          {mode === "note" ? (
            <>
              <Lock aria-hidden="true" />
              Save note
            </>
          ) : (
            <>
              <CornerDownLeft aria-hidden="true" />
              Send on {channel}
            </>
          )}
        </Button>
      </div>

      <QuoteBuilder
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        detail={detail}
        onAttach={attachQuote}
      />
    </div>
  );
}

function ModeTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Lock;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-meta",
        "transition-colors duration-[80ms]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        active
          ? "bg-ink-900 font-medium text-text-onDark"
          : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * What the draft was built from, and what it refused to decide.
 *
 * This panel is the reason the feature is allowed to exist: the operator can
 * check the sentence against the record without reopening the file, and any
 * caveat is a place where a person is still required (§20).
 */
function AssistPanel({
  draft,
  edited,
  onDiscard,
}: {
  draft: AssistDraft;
  edited: boolean;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-2 rounded-[var(--radius-card)] border border-intel-500/25 bg-intel-100/40 px-3 py-2">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-intel-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold text-intel-700">
            Draft, not sent. {draft.intent}.
          </p>
          <p className="mt-0.5 text-micro text-text-muted">
            {edited
              ? "You have edited the draft. The text below is yours."
              : "Edit it freely. Nothing goes out until you press send."}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Discard the draft" onClick={onDiscard}>
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1">
        {draft.grounding.map((fact) => (
          <li
            key={fact}
            data-numeric
            className="rounded-[var(--radius-micro)] bg-surface px-1.5 py-0.5 text-micro text-text-secondary shadow-[var(--shadow-hairline)]"
          >
            {fact}
          </li>
        ))}
      </ul>

      {draft.caveats.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {draft.caveats.map((caveat) => (
            <li key={caveat} className="flex gap-1.5 text-micro leading-relaxed text-caution-700">
              <span aria-hidden="true">•</span>
              <span>{caveat}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The quote written out the way a guest reads it, not as a table. */
function quoteParagraph(quote: QuoteResult): string {
  return `${quote.roomTypeName}: ${formatINR(quote.nightlyRate)} per room per night for ${quote.rooms} ${
    quote.rooms === 1 ? "room" : "rooms"
  } across ${quote.nights} ${quote.nights === 1 ? "night" : "nights"}, ${formatINR(
    quote.total,
  )} in total including GST. ${MEAL_PLAN_INCLUSION[quote.mealPlan]}.`;
}
