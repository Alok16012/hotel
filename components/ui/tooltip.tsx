"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { shortcut?: string }
>(({ className, sideOffset = 6, children, shortcut, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[90] flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-meta font-medium",
        "material-float-inverse text-text-onDark shadow-[var(--shadow-float)]",
        // anim-pop scales from the trigger's edge, not the tooltip's centre.
        "anim-pop",
        className,
      )}
      {...props}
    >
      {children}
      {shortcut ? (
        <kbd className="ml-0.5 rounded-[3px] bg-white/12 px-1 font-mono text-micro text-text-onDark-muted">
          {shortcut}
        </kbd>
      ) : null}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";
