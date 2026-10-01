"use client";

import { ArrowUpDown, CreditCard, Search, Tag, X } from "lucide-react";
import { ChoiceMenu, MultiMenu, ScopeChip } from "@/components/common/toolbar-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import type { BookingStatus, PaymentStatus } from "@/types";
import {
  EMPTY_LEDGER_FILTERS,
  LEDGER_SCOPES,
  LEDGER_SORTS,
  activeFilterCount,
  type LedgerFilterState,
  type LedgerScope,
} from "./model";

const STATUSES = Object.keys(BOOKING_STATUS) as BookingStatus[];
const PAYMENTS = Object.keys(PAYMENT_STATUS) as PaymentStatus[];

/**
 * Scope first, then narrowing (§14).
 *
 * Same two-row grammar as the follow-up queue and the guest directory, because
 * a person who has learned to filter one list in this product should not have
 * to learn a second grammar to filter the next one.
 */
export function LedgerToolbar({
  state,
  counts,
  onChange,
  shown,
  total,
}: {
  state: LedgerFilterState;
  counts: Record<LedgerScope, number>;
  onChange: (next: Partial<LedgerFilterState>) => void;
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(state);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Which bookings to show"
        className="scrollbar-slim flex items-center gap-1 overflow-x-auto"
      >
        {LEDGER_SCOPES.map((scope) => (
          <ScopeChip
            key={scope.id}
            id={scope.id}
            label={scope.label}
            count={counts[scope.id]}
            urgent={scope.id === "owing"}
            current={state.scope}
            onSelect={(next) => onChange({ scope: next })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative w-full sm:w-[17rem]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={state.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="Reference, guest, room number"
            aria-label="Search bookings"
            className="pl-8"
          />
        </div>

        <MultiMenu
          icon={Tag}
          label="Status"
          selected={state.statuses.length}
          onClear={() => onChange({ statuses: [] })}
          items={STATUSES.map((status) => ({
            value: status,
            label: BOOKING_STATUS[status].label,
            checked: state.statuses.includes(status),
          }))}
          onToggle={(value) => onChange({ statuses: toggle(state.statuses, value as BookingStatus) })}
        />

        <MultiMenu
          icon={CreditCard}
          label="Payment"
          selected={state.payments.length}
          onClear={() => onChange({ payments: [] })}
          items={PAYMENTS.map((payment) => ({
            value: payment,
            label: PAYMENT_STATUS[payment].label,
            checked: state.payments.includes(payment),
          }))}
          onToggle={(value) => onChange({ payments: toggle(state.payments, value as PaymentStatus) })}
        />

        <ChoiceMenu
          icon={ArrowUpDown}
          heading="Sort by"
          options={LEDGER_SORTS}
          value={state.sort}
          onSelect={(id) => onChange({ sort: id })}
        />

        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                query: EMPTY_LEDGER_FILTERS.query,
                statuses: EMPTY_LEDGER_FILTERS.statuses,
                payments: EMPTY_LEDGER_FILTERS.payments,
              })
            }
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <p data-numeric className="ml-auto shrink-0 text-meta text-text-muted">
          {shown === total
            ? `${total} ${total === 1 ? "booking" : "bookings"}`
            : `${shown} of ${total} bookings shown`}
        </p>
      </div>
    </div>
  );
}
