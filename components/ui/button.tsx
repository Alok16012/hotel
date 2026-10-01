"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Every variant ships all eight states: default, hover, focus-visible, active,
 * disabled, and (via `loading`) a busy state. Press feedback is a 0.97 scale —
 * the control has to feel like it received the click.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-medium select-none cursor-pointer",
    "transition-[background-color,box-shadow,color,transform] duration-[130ms] ease-[var(--ease-out-quint)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    "active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100",
    "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-brand-700 text-white shadow-[var(--shadow-raised),var(--shadow-bezel-inverse)] hover:bg-brand-600 active:bg-brand-800",
        secondary:
          "bg-surface text-text-primary shadow-[var(--shadow-raised),var(--shadow-bezel)] hover:bg-ink-50 active:bg-ink-100",
        ghost:
          "text-text-secondary hover:bg-ink-100 hover:text-text-primary active:bg-ink-200",
        subtle:
          "bg-ink-100 text-text-secondary hover:bg-ink-200 hover:text-text-primary",
        critical:
          "bg-critical-600 text-white shadow-[var(--shadow-raised),var(--shadow-bezel-inverse)] hover:bg-critical-500 active:bg-critical-700",
        outline:
          "border border-hairline-strong bg-transparent text-text-primary hover:bg-ink-50 active:bg-ink-100",
      },
      size: {
        xs: "h-6 rounded-[var(--radius-sm)] px-2 text-micro [&_svg]:size-3",
        sm: "h-7 rounded-[var(--radius-sm)] px-2.5 text-meta [&_svg]:size-3.5",
        md: "h-8 rounded-[var(--radius-control)] px-3 text-body [&_svg]:size-4",
        lg: "h-9 rounded-[var(--radius-control)] px-4 text-body [&_svg]:size-4",
        icon: "size-8 rounded-[var(--radius-control)] [&_svg]:size-4",
        "icon-sm": "size-7 rounded-[var(--radius-sm)] [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            {/* Content stays in flow so the button never changes width mid-action */}
            <span className="invisible contents">{children}</span>
            <span className="absolute inset-0 grid place-items-center">
              <Spinner />
            </span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { buttonVariants };
