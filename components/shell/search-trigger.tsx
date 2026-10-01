"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { Kbd } from "@/components/ui/kbd";

/**
 * The topbar search is a button, not an input.
 *
 * Typing here would create two competing search surfaces: this field and the
 * palette it opens. One entry point, one mental model — click or press ⌘K and
 * you land in the same place.
 */
export function SearchTrigger() {
  const setCommandOpen = useUi((s) => s.setCommandOpen);

  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      className={cn(
        "group flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5",
        "border border-hairline bg-surface-sunken text-left",
        "transition-[background-color,border-color] duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:border-hairline-strong hover:bg-surface",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
      )}
    >
      <Search className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-body text-text-muted">
        Search guest, lead, booking, phone number…
      </span>
      <Kbd className="hidden sm:inline-grid">⌘K</Kbd>
    </button>
  );
}
