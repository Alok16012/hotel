"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[40] min-w-[11rem] overflow-hidden p-1",
        "rounded-[var(--radius-card)] material-float shadow-[var(--shadow-overlay)]",
        "anim-pop",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    intent?: "default" | "critical";
    shortcut?: string;
  }
>(({ className, intent = "default", shortcut, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-body outline-none",
      "transition-colors duration-[80ms]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
      "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-muted",
      intent === "default"
        ? "text-text-primary data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700 data-[highlighted]:[&_svg]:text-brand-600"
        : "text-critical-600 data-[highlighted]:bg-critical-100 data-[highlighted]:[&_svg]:text-critical-600",
      className,
    )}
    {...props}
  >
    {children}
    {shortcut ? (
      <kbd className="ml-auto font-mono text-micro text-text-muted">{shortcut}</kbd>
    ) : null}
  </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pl-2 pr-7 text-body outline-none",
      "text-text-primary transition-colors duration-[80ms]",
      "data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
      className,
    )}
    {...props}
  >
    {children}
    <span className="absolute right-2 grid size-4 place-items-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-3.5 text-brand-600" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pl-7 pr-2 text-body outline-none",
      "text-text-primary transition-colors duration-[80ms]",
      "data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
      className,
    )}
    {...props}
  >
    {/* The box is drawn even when unchecked. A tick that only appears on
        selection leaves the operator guessing whether the row is selectable. */}
    <span className="absolute left-2 grid size-4 place-items-center rounded-[var(--radius-micro)] border border-hairline-strong transition-colors duration-[80ms] group-data-[state=checked]:border-brand-600 group-data-[state=checked]:bg-brand-600">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-3 text-white" strokeWidth={3} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2 pb-1 pt-1.5 text-micro font-semibold uppercase tracking-wider text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-hairline", className)}
      {...props}
    />
  );
}
