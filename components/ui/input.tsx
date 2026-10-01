import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text input. The border darkens on hover and the focus ring is the same brand
 * ring every other control uses, so a keyboard user never has to hunt for where
 * they are.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-[var(--radius-control)] bg-surface px-2.5 text-body text-text-primary",
        "border border-hairline-strong shadow-[var(--shadow-bezel)]",
        "placeholder:text-text-muted",
        "transition-[border-color,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:border-ink-400",
        "focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-[var(--radius-control)] bg-surface px-2.5 py-2 text-body leading-relaxed text-text-primary",
      "border border-hairline-strong shadow-[var(--shadow-bezel)]",
      "placeholder:text-text-muted",
      "transition-[border-color,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
      "hover:border-ink-400",
      "focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
