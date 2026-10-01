import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-grid shrink-0 place-items-center overflow-hidden font-semibold uppercase select-none",
  {
    variants: {
      size: {
        xs: "size-5 rounded-[var(--radius-micro)] text-[9px]",
        sm: "size-6 rounded-[var(--radius-sm)] text-micro",
        md: "size-8 rounded-[var(--radius-control)] text-meta",
        lg: "size-10 rounded-[var(--radius-card)] text-body",
        xl: "size-14 rounded-[var(--radius-surface)] text-section",
      },
      tone: {
        brand: "bg-brand-100 text-brand-700",
        accent: "bg-accent-100 text-accent-700",
        neutral: "bg-ink-200 text-ink-700",
        intel: "bg-intel-100 text-intel-700",
        positive: "bg-positive-100 text-positive-700",
        caution: "bg-caution-100 text-caution-700",
      },
    },
    defaultVariants: { size: "md", tone: "brand" },
  },
);

const TONES = ["brand", "accent", "neutral", "intel", "positive", "caution"] as const;

/**
 * Deterministic tone from the name, so a given guest keeps the same colour
 * across every screen and across reloads. Random would be prettier and wrong.
 */
export function toneForName(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  initials: string;
  /** Small dot on the corner for presence. */
  presence?: "available" | "busy" | "on_call" | "offline";
}

const PRESENCE_COLOR: Record<NonNullable<AvatarProps["presence"]>, string> = {
  available: "bg-positive-500",
  busy: "bg-caution-500",
  on_call: "bg-accent-500",
  offline: "bg-ink-400",
};

const PRESENCE_LABEL: Record<NonNullable<AvatarProps["presence"]>, string> = {
  available: "Available",
  busy: "Busy",
  on_call: "On call",
  offline: "Offline",
};

export function Avatar({ className, size, tone, initials, presence, ...props }: AvatarProps) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(avatarVariants({ size, tone }), "tracking-tight", className)}
        aria-hidden="true"
        {...props}
      >
        {initials}
      </span>
      {presence ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface",
            PRESENCE_COLOR[presence],
          )}
        >
          <span className="sr-only">{PRESENCE_LABEL[presence]}</span>
        </span>
      ) : null}
    </span>
  );
}
