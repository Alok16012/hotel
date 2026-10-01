"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/**
 * A toggle for settings that take effect the moment they are flipped.
 *
 * Used where there is no Save button to press: a pricing rule is either live or
 * it is not. Anything that needs confirming belongs in a form with a button,
 * not behind a switch that quietly commits.
 *
 * The thumb moves on transform alone and the track colour carries the state,
 * but colour is never the only signal: every call site pairs this with a label
 * or an aria-label that says which way it is set.
 */
export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full",
      "border border-hairline-strong p-px",
      "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
      "disabled:cursor-not-allowed disabled:opacity-45",
      "data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600",
      "data-[state=unchecked]:bg-ink-200",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-3.5 rounded-full bg-surface shadow-[var(--shadow-hairline)]",
        "transition-transform duration-[130ms] ease-[var(--ease-out-quint)]",
        "data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
