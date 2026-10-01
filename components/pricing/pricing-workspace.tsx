"use client";

import * as React from "react";
import { Plus, RotateCcw, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { RateCardRow } from "@/lib/availability";
import type {
  DiscountAuthority,
  ISODate,
  PricingRule,
  RoomType,
  TeamMember,
} from "@/types";
import { AuthorityPanel } from "./authority-panel";
import { RateCard } from "./rate-card";
import { RuleDialog } from "./rule-dialog";
import { RuleList } from "./rule-list";
import { Simulator } from "./simulator";
import {
  applyForm,
  countChanges,
  move,
  removeRule,
  renumber,
  rulesDiffer,
  setEnabled,
  toForm,
  type RuleForm,
} from "./model";

/**
 * The pricing screen (§19).
 *
 * Edits land in a draft and stay there until someone publishes. That split is
 * the whole design: a discount policy is a commitment the desk will quote from
 * for months, and a screen where toggling a switch changes what reception is
 * allowed to do the same second is a screen nobody will open on a busy day.
 *
 * The simulator reads the draft rather than the published list, so the question
 * "what does this change actually do to a real enquiry" is answerable before
 * the change is real. That is the only honest order to do it in.
 */
export function PricingWorkspace({
  dates,
  rows,
  occupancy,
  roomTypes,
  rules: seeded,
  authority,
  team,
  currentUser,
}: {
  dates: ISODate[];
  rows: RateCardRow[];
  occupancy: number[];
  roomTypes: RoomType[];
  rules: PricingRule[];
  authority: DiscountAuthority[];
  team: TeamMember[];
  currentUser: TeamMember;
}) {
  const [published, setPublished] = React.useState<PricingRule[]>(() => renumber(seeded));
  const [draft, setDraft] = React.useState<PricingRule[]>(() => renumber(seeded));
  const [dialog, setDialog] = React.useState<{ open: boolean; form: RuleForm | null }>({
    open: false,
    form: null,
  });

  const dirty = rulesDiffer(draft, published);
  const changes = countChanges(draft, published);

  const nameOf = React.useCallback(
    (id?: string) => (id ? team.find((m) => m.id === id)?.name : undefined),
    [team],
  );

  function publish() {
    const previous = published;
    setPublished(renumber(draft));
    toast.success(`Published ${changes} rule change${changes === 1 ? "" : "s"}`, {
      description: "Every quote from now on is priced against this policy.",
      action: {
        label: "Undo",
        onClick: () => {
          setPublished(previous);
          setDraft(previous);
        },
      },
    });
  }

  function discard() {
    setDraft(published);
    toast.success("Draft discarded", {
      description: "Back to the published policy.",
    });
  }

  function onConfirm(form: RuleForm) {
    setDraft((current) => applyForm(current, form, currentUser.id));
    setDialog({ open: false, form: null });
    toast.success(form.id ? `Updated ${form.name.trim()}` : `Added ${form.name.trim()}`, {
      description: "Still a draft. Publish when the simulation reads right.",
    });
  }

  function onDelete(rule: PricingRule) {
    setDraft((current) => removeRule(current, rule.id));
    toast.success(`Removed ${rule.name}`, {
      description: "Draft only. Nothing is priced differently until you publish.",
      action: {
        label: "Undo",
        onClick: () =>
          setDraft((current) =>
            current.some((r) => r.id === rule.id) ? current : renumber([...current, rule]),
          ),
      },
    });
  }

  const cheapest = Math.min(...rows.map((row) => Math.min(...row.rates.map((r) => r.currentRate))));
  const live = draft.filter((r) => r.enabled).length;

  return (
    <>
      <PageHeader
        eyebrow="Revenue"
        title="Pricing"
        description={`${live} discount rules live across ${roomTypes.length} categories. Lowest rate on sale in the fortnight is ${formatINR(cheapest)}.`}
        actions={
          <div className="flex items-center gap-2">
            {dirty ? (
              <>
                <Badge intent="caution">
                  {changes} unpublished change{changes === 1 ? "" : "s"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={discard}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Discard
                </Button>
              </>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialog({ open: true, form: toForm() })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New rule
            </Button>
            <Button variant="primary" size="sm" disabled={!dirty} onClick={publish}>
              Publish
            </Button>
          </div>
        }
      />

      <PageBody className="space-y-4">
        <RateCard dates={dates} rows={rows} occupancy={occupancy} today={dates[0]} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <RuleList
            rules={draft}
            roomTypes={roomTypes}
            authorName={nameOf}
            onToggle={(rule, enabled) =>
              setDraft((current) => setEnabled(current, rule.id, enabled))
            }
            onMove={(rule, direction) => setDraft((current) => move(current, rule.id, direction))}
            onEdit={(rule) => setDialog({ open: true, form: toForm(rule) })}
            onDelete={onDelete}
            onNew={() => setDialog({ open: true, form: toForm() })}
          />

          <div className="space-y-4">
            <Simulator
              dates={dates}
              occupancy={occupancy}
              roomTypes={roomTypes}
              rules={draft}
              dirty={dirty}
            />
            <AuthorityPanel authority={authority} currentRole={currentUser.role} />
          </div>
        </div>

        <p className="flex items-center gap-1.5 pb-2 text-meta text-text-muted">
          <Tag className="size-3.5" aria-hidden="true" />
          Rates are derived from occupancy, not stored. Rule edits live in this session only and
          reach no live channel.
        </p>
      </PageBody>

      <RuleDialog
        open={dialog.open}
        initial={dialog.form}
        roomTypes={roomTypes}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onConfirm={onConfirm}
      />
    </>
  );
}
