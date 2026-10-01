import { cn } from "@/lib/utils";
import { LEAD_SOURCE } from "@/lib/labels";
import type { LeadSource } from "@/types";

/**
 * Channel indicator (§30).
 *
 * The colour is applied through a CSS variable rather than a Tailwind class
 * because the class name would have to be built from the source value at
 * runtime, and Tailwind's scanner only sees literal strings — `bg-channel-${x}`
 * compiles to nothing. The channel variables are declared in `@layer base`
 * rather than `@theme` for the same reason: Tailwind drops a theme variable no
 * utility refers to, and nothing here refers to one by a literal name.
 *
 * The two-letter mark is never the only signal: `label` is always available to
 * assistive technology, and the text form is shown at `md`.
 */
export function SourceBadge({
  source,
  size = "sm",
  showLabel = false,
  className,
}: {
  source: LeadSource;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const channel = LEAD_SOURCE[source];
  const color = `var(--color-channel-${source.replace(/_/g, "-")})`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}
      title={channel.label}
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: color }}
        className={cn(
          "grid shrink-0 place-items-center rounded-[var(--radius-micro)] font-semibold text-white",
          size === "sm" ? "size-4 text-[9px]" : "size-5 text-micro",
        )}
      >
        {channel.short}
      </span>
      {showLabel ? (
        <span className="truncate text-meta text-text-secondary">{channel.label}</span>
      ) : (
        <span className="sr-only">{channel.label}</span>
      )}
    </span>
  );
}
