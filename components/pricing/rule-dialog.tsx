"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRICING_ACTION, PRICING_OPERATOR, PRICING_SUBJECT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  PricingActionKind,
  PricingCondition,
  PricingConditionSubject,
  PricingOperator,
  RoomType,
} from "@/types";
import {
  actionTakesValue,
  blankCondition,
  describeAction,
  describeCondition,
  formIsValid,
  isNumericSubject,
  operatorsFor,
  optionsFor,
  SUBJECTS,
  withOperator,
  withSubject,
  type RuleForm,
} from "./model";

/**
 * Writing a rule (§19).
 *
 * The form's one job is to keep the stored triple and the readable sentence in
 * agreement. Changing the subject from occupancy to guest segment rewrites the
 * operator and clears the value, because a membership test holding the number
 * 85 is a rule that will never fire and will never explain why.
 *
 * The sentence at the bottom is not decoration. It is the rule as the evaluator
 * will read it, and seeing it before saving is the difference between a policy
 * the property trusts and a list of settings nobody remembers agreeing to.
 */

/**
 * Drop a clause into mid sentence after "When".
 *
 * Only the opening letter moves. Lowercasing the whole clause would turn the
 * values inside it into something the property does not call them: a Suite
 * becomes a suite and, worse, VIP becomes vip, which reads as a typo in the one
 * sentence that exists to be trusted.
 */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
export function RuleDialog({
  open,
  initial,
  roomTypes,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  initial: RuleForm | null;
  roomTypes: RoomType[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (form: RuleForm) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[var(--z-overlay)] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "anim-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(94vw,36rem)]",
            "-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-surface)]",
            "material-float shadow-[var(--shadow-overlay)]",
          )}
        >
          {open && initial ? (
            <RuleEditor
              key={initial.id ?? "new"}
              initial={initial}
              roomTypes={roomTypes}
              onConfirm={onConfirm}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RuleEditor({
  initial,
  roomTypes,
  onConfirm,
}: {
  initial: RuleForm;
  roomTypes: RoomType[];
  onConfirm: (form: RuleForm) => void;
}) {
  const [form, setForm] = React.useState<RuleForm>(initial);
  const valid = formIsValid(form);

  function patchCondition(index: number, next: PricingCondition) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === index ? next : c)),
    }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onConfirm(form);
      }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          <Dialog.Title className="text-section font-semibold text-text-primary">
            {initial.id ? "Edit rule" : "New rule"}
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-meta text-text-muted">
            Every condition must hold for the rule to apply. Order is set in the list.
          </Dialog.Description>
        </div>
        <Dialog.Close
          className={cn(
            "-mr-1 -mt-1 rounded-[var(--radius-control)] p-1 text-text-muted",
            "transition-colors duration-[130ms] hover:bg-surface-sunken hover:text-text-primary",
          )}
          aria-label="Close"
        >
          <X className="size-4" />
        </Dialog.Close>
      </header>

      <div className="max-h-[66vh] space-y-3 overflow-y-auto px-4 py-4 scrollbar-slim">
        <Field label="Name" htmlFor="rule-name">
          <Input
            id="rule-name"
            value={form.name}
            placeholder="Protect a full house"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>

        <Field
          label="Why it exists"
          htmlFor="rule-description"
          hint="Read by whoever inherits this policy. Say the reasoning, not the mechanics."
        >
          <Textarea
            id="rule-description"
            rows={2}
            value={form.description}
            placeholder="Once the night is 85 percent sold the rate holds. Nothing left to fill, so nothing to give away."
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <fieldset className="rounded-[var(--radius-card)] border border-hairline p-3">
          <legend className="px-1 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
            Conditions
          </legend>

          <div className="space-y-2">
            {form.conditions.map((condition, index) => (
              <ConditionRow
                key={index}
                condition={condition}
                roomTypes={roomTypes}
                removable={form.conditions.length > 1}
                onChange={(next) => patchCondition(index, next)}
                onRemove={() =>
                  setForm((f) => ({
                    ...f,
                    conditions: f.conditions.filter((_, i) => i !== index),
                  }))
                }
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mt-2"
            onClick={() =>
              setForm((f) => ({ ...f, conditions: [...f.conditions, blankCondition("nights")] }))
            }
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add condition
          </Button>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <Field label="Then" htmlFor="rule-action">
            <Select
              id="rule-action"
              value={form.action.kind}
              onChange={(e) => {
                const kind = e.target.value as PricingActionKind;
                setForm((f) => ({
                  ...f,
                  action: {
                    kind,
                    valuePct: actionTakesValue(kind) ? (f.action.valuePct ?? 10) : undefined,
                  },
                }));
              }}
            >
              {(Object.keys(PRICING_ACTION) as PricingActionKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {PRICING_ACTION[kind].label}
                </option>
              ))}
            </Select>
          </Field>

          {actionTakesValue(form.action.kind) ? (
            <Field label="Percent" htmlFor="rule-pct">
              <Input
                id="rule-pct"
                type="number"
                min={1}
                max={60}
                value={form.action.valuePct ?? 0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    action: {
                      ...f.action,
                      valuePct: Math.min(60, Math.max(0, Number(e.target.value) || 0)),
                    },
                  }))
                }
              />
            </Field>
          ) : null}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-hairline px-3 py-2">
          <span className="min-w-0">
            <span className="block text-body font-medium text-text-primary">
              {form.enabled ? "Live" : "Paused"}
            </span>
            <span className="block text-meta text-text-muted">
              {form.enabled
                ? "Included in every evaluation from the moment it is published."
                : "Kept in the list and skipped by the evaluator."}
            </span>
          </span>
          <Switch
            checked={form.enabled}
            onCheckedChange={(next) => setForm((f) => ({ ...f, enabled: next }))}
            aria-label={form.enabled ? "Rule is live" : "Rule is paused"}
          />
        </label>

        <p className="rounded-[var(--radius-card)] bg-surface-sunken px-3 py-2 text-meta leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">Reads as:</span> When{" "}
          {form.conditions.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 ? " and " : ""}
              <span className="text-text-primary">
                {lowerFirst(describeCondition(c, roomTypes))}
              </span>
            </React.Fragment>
          ))}
          , {lowerFirst(describeAction(form.action))}.
        </p>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-hairline bg-surface-sunken/60 px-4 py-3">
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="sm">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" variant="primary" size="sm" disabled={!valid}>
          {initial.id ? "Save rule" : "Add rule"}
        </Button>
      </footer>
    </form>
  );
}

function ConditionRow({
  condition,
  roomTypes,
  removable,
  onChange,
  onRemove,
}: {
  condition: PricingCondition;
  roomTypes: RoomType[];
  removable: boolean;
  onChange: (next: PricingCondition) => void;
  onRemove: () => void;
}) {
  const numeric = isNumericSubject(condition.subject);

  return (
    <div className="rounded-[var(--radius-control)] bg-surface-sunken/60 p-2">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Subject"
          className="h-7 text-meta"
          value={condition.subject}
          onChange={(e) =>
            onChange(withSubject(condition, e.target.value as PricingConditionSubject))
          }
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {PRICING_SUBJECT[s]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Comparison"
          className="h-7 text-meta"
          value={condition.operator}
          disabled={!numeric}
          onChange={(e) => onChange(withOperator(condition, e.target.value as PricingOperator))}
        >
          {operatorsFor(condition.subject).map((op) => (
            <option key={op} value={op}>
              {PRICING_OPERATOR[op]}
            </option>
          ))}
        </Select>

        {removable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove condition"
            onClick={onRemove}
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className="mt-2">
        {condition.operator === "between" ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              aria-label="Lower bound"
              className="h-7 text-meta"
              value={(condition.value as [number, number])[0]}
              onChange={(e) => {
                const [, high] = condition.value as [number, number];
                onChange({ ...condition, value: [Number(e.target.value) || 0, high] });
              }}
            />
            <span className="shrink-0 text-meta text-text-muted">and</span>
            <Input
              type="number"
              aria-label="Upper bound"
              className="h-7 text-meta"
              value={(condition.value as [number, number])[1]}
              onChange={(e) => {
                const [low] = condition.value as [number, number];
                onChange({ ...condition, value: [low, Number(e.target.value) || 0] });
              }}
            />
          </div>
        ) : numeric ? (
          <Input
            type="number"
            aria-label="Value"
            className="h-7 text-meta"
            value={condition.value as number}
            onChange={(e) => onChange({ ...condition, value: Number(e.target.value) || 0 })}
          />
        ) : (
          <ValuePicker
            subject={condition.subject}
            selected={(condition.value as string[]) ?? []}
            roomTypes={roomTypes}
            onChange={(next) => onChange({ ...condition, value: next })}
          />
        )}
      </div>
    </div>
  );
}

/** Membership is a set, so the control is a set of toggles, not a dropdown. */
function ValuePicker({
  subject,
  selected,
  roomTypes,
  onChange,
}: {
  subject: PricingConditionSubject;
  selected: string[];
  roomTypes: RoomType[];
  onChange: (next: string[]) => void;
}) {
  const options = optionsFor(subject, roomTypes);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on ? selected.filter((v) => v !== option.value) : [...selected, option.value],
              )
            }
            className={cn(
              "rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-micro",
              "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              on
                ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                : "border-hairline-strong bg-surface text-text-secondary hover:border-ink-400",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
