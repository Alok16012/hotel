"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatStayRange } from "@/lib/format";
import { LOST_REASON } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { LostReason } from "@/types";

const REASONS = Object.keys(LOST_REASON) as LostReason[];

/**
 * The one stage change the board refuses to accept silently (§15).
 *
 * Losing an enquiry is the only move on this board that destroys information,
 * and an unreasoned loss is worth nothing to the channel report that reads this
 * field later. So Lost is a two step drop: the card does not move until a
 * reason is chosen, and cancelling leaves the enquiry exactly where it was.
 */
export function LostReasonDialog({
  row,
  onCancel,
  onConfirm,
}: {
  /** The lead being dropped into Lost, or null when the dialog is closed. */
  row: LeadRow | null;
  onCancel: () => void;
  onConfirm: (reason: LostReason) => void;
}) {
  return (
    <Dialog.Root open={row !== null} onOpenChange={(open) => (open ? null : onCancel())}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[50] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "anim-modal fixed left-1/2 top-1/2 z-[70] w-[min(94vw,26rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-[var(--radius-surface)] material-float shadow-[var(--shadow-overlay)]",
          )}
        >
          {row ? <LostReasonForm key={row.id} row={row} onConfirm={onConfirm} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LostReasonForm({
  row,
  onConfirm,
}: {
  row: LeadRow;
  onConfirm: (reason: LostReason) => void;
}) {
  const [reason, setReason] = React.useState<LostReason | null>(null);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <Dialog.Title className="text-card font-semibold text-text-primary">
            Why was this lost?
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-meta text-text-muted">
            {row.guestName} · {formatStayRange(row.checkIn, row.checkOut, row.nights)} ·{" "}
            {formatINR(row.value)}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Close">
            <X aria-hidden="true" />
          </Button>
        </Dialog.Close>
      </header>

      <fieldset className="px-4 py-3">
        <legend className="sr-only">Reason this enquiry was lost</legend>
        {/* One per row on a phone. Two columns truncated "Not a serious
            enquiry" to "Not a serious en…", and a reason nobody can finish
            reading is not a reason anybody should be asked to pick. */}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {REASONS.map((value) => {
            const selected = reason === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2",
                  "text-meta transition-colors duration-[80ms]",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
                  "has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-brand-500",
                  selected
                    ? "bg-brand-50 font-medium text-brand-800 shadow-[inset_0_0_0_1px_var(--color-brand-300)]"
                    : "text-text-secondary shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-ink-50",
                )}
              >
                <input
                  type="radio"
                  name="lost-reason"
                  value={value}
                  checked={selected}
                  onChange={() => setReason(value)}
                  className="sr-only"
                />
                {/* Selection is a filled dot as well as a tint, so the choice
                    survives being read on a dim screen at the front desk. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-3.5 shrink-0 place-items-center rounded-full",
                    selected ? "bg-brand-600" : "shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]",
                  )}
                >
                  {selected ? <span className="size-1 rounded-full bg-white" /> : null}
                </span>
                <span className="min-w-0 truncate">{LOST_REASON[value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <footer className="flex items-center justify-between gap-3 border-t border-hairline bg-surface-sunken/60 px-4 py-2.5">
        <p className="text-micro text-text-muted">
          {row.reference} stays on the board until you confirm.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Dialog.Close asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="critical"
            size="sm"
            disabled={reason === null}
            onClick={() => reason && onConfirm(reason)}
          >
            Mark lost
          </Button>
        </div>
      </footer>
    </>
  );
}
