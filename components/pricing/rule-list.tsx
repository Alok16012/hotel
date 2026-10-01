"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DEMO_NOW } from "@/lib/clock";
import { formatRelative } from "@/lib/format";
import { PRICING_ACTION } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PricingAction, PricingRule, RoomType } from "@/types";
import { describeCondition } from "./model";

/**
 * The discount policy, in the order it is applied (§19).
 *
 * An ordered list rather than a table, because priority here is not a column to
 * sort by: it is the thing being edited. The arrows move a rule and renumber
 * everything, so the list on screen is always the exact sequence the evaluator
 * walks.
 *
 * A paused rule stays in place instead of disappearing into an archive. The
 * monsoon offer is not deleted every October and rewritten every June, and a
 * policy list that hides what is switched off invites someone to write it twice.
 */
export function RuleList({
  rules,
  roomTypes,
  authorName,
  onToggle,
  onMove,
  onEdit,
  onDelete,
  onNew,
}: {
  rules: PricingRule[];
  roomTypes: RoomType[];
  authorName: (id?: string) => string | undefined;
  onToggle: (rule: PricingRule, enabled: boolean) => void;
  onMove: (rule: PricingRule, direction: -1 | 1) => void;
  onEdit: (rule: PricingRule) => void;
  onDelete: (rule: PricingRule) => void;
  onNew: () => void;
}) {
  const live = rules.filter((r) => r.enabled).length;

  return (
    <Panel
      title="Discount rules"
      description={`${live} live of ${rules.length}. Evaluated in order: the first block ends it, the first ceiling sets it.`}
      aside={
        <Button variant="secondary" size="xs" onClick={onNew}>
          <Plus className="size-3.5" aria-hidden="true" />
          New rule
        </Button>
      }
    >
      <ol className="divide-y divide-hairline">
        {rules.map((rule, index) => (
          <li
            key={rule.id}
            className={cn(
              "flex gap-3 px-4 py-3 transition-colors duration-[130ms]",
              rule.enabled ? "bg-surface" : "bg-surface-sunken/50",
            )}
          >
            <span
              data-numeric
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
                "border border-hairline-strong text-meta font-semibold",
                rule.enabled ? "text-text-secondary" : "text-text-muted",
              )}
            >
              {rule.priority}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "text-body font-semibold",
                      rule.enabled ? "text-text-primary" : "text-text-muted",
                    )}
                  >
                    {rule.name}
                  </h3>
                  <p className="mt-0.5 text-meta leading-relaxed text-text-muted">
                    {rule.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge intent={rule.enabled ? PRICING_ACTION[rule.action.kind].intent : "outline"}>
                    {actionBadge(rule.action)}
                  </Badge>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(next) => onToggle(rule, next)}
                    aria-label={`${rule.name} is ${rule.enabled ? "live" : "paused"}`}
                  />
                </div>
              </div>

              <ul className="mt-2 flex flex-wrap gap-1.5">
                {rule.conditions.map((condition, i) => (
                  <li
                    key={`${condition.subject}-${i}`}
                    className={cn(
                      "rounded-[var(--radius-sm)] border border-hairline bg-surface-sunken px-1.5 py-0.5",
                      "text-micro text-text-secondary",
                    )}
                  >
                    {describeCondition(condition, roomTypes)}
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="truncate text-micro text-text-muted">
                  {rule.enabled ? "Live" : "Paused"} · edited by{" "}
                  {authorName(rule.lastEditedById) ?? "the property"}{" "}
                  {formatRelative(rule.lastEditedAt, DEMO_NOW)}
                </p>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${rule.name} up`}
                    disabled={index === 0}
                    onClick={() => onMove(rule, -1)}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${rule.name} down`}
                    disabled={index === rules.length - 1}
                    onClick={() => onMove(rule, 1)}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${rule.name}`}
                    onClick={() => onEdit(rule)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${rule.name}`}
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Short enough for a badge, specific enough to be worth reading. */
function actionBadge(action: PricingAction): string {
  switch (action.kind) {
    case "allow_discount_up_to":
      return `Up to ${action.valuePct ?? 0}%`;
    case "add_discount":
      return `${action.valuePct ?? 0}% automatic`;
    case "require_approval":
      return "Needs approval";
    case "block":
      return "No discount";
  }
}
