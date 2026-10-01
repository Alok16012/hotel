import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Low-chroma tinted fills rather than saturated blocks. At the density this
 * product runs, a saturated badge on every row turns the table into noise.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap font-medium [&_svg]:shrink-0",
  {
    variants: {
      intent: {
        neutral: "bg-ink-100 text-ink-700",
        brand: "bg-brand-50 text-brand-700",
        accent: "bg-accent-100 text-accent-700",
        positive: "bg-positive-100 text-positive-700",
        caution: "bg-caution-100 text-caution-700",
        critical: "bg-critical-100 text-critical-700",
        intel: "bg-intel-100 text-intel-700",
        outline: "border border-hairline-strong text-text-secondary",
      },
      size: {
        sm: "h-4 rounded-[var(--radius-micro)] px-1.5 text-micro [&_svg]:size-2.5",
        md: "h-5 rounded-[var(--radius-sm)] px-1.5 text-meta [&_svg]:size-3",
      },
    },
    defaultVariants: { intent: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, intent, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent, size }), className)} {...props} />;
}

export { badgeVariants };
