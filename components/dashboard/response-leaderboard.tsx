import { Panel, PanelLink } from "@/components/common/panel";
import { Avatar, toneForName } from "@/components/ui/avatar";
import { formatDuration, formatPct } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { ResponsePerformance } from "@/types";

/**
 * How quickly the desk replies, per person (§21).
 *
 * Two clocks are shown side by side at the top because collapsing them is the
 * easiest way for a dashboard like this to flatter itself. The automation
 * answers in about a minute on the threads it reaches; the number that says
 * whether the desk is keeping up is the one beside it, measured only on replies
 * a colleague actually wrote. The coverage count sits under the first figure so
 * the speed is never read as reach.
 */
export function ResponseLeaderboard({
  data,
  slaTargetSec,
}: {
  data: ResponsePerformance;
  slaTargetSec: number;
}) {
  const slowest = Math.max(...data.byMember.map((m) => m.medianResponseSec), slaTargetSec);

  return (
    <Panel
      title="Response times"
      description="Measured from the enquiry arriving to the first reply a person wrote."
      footer={<PanelLink href="/team">Team performance</PanelLink>}
    >
      <div className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline">
        <Stat
          label="Automatic first touch"
          value={formatDuration(data.medianAcknowledgementSec)}
          note={`answered first on ${data.acknowledgedThreads} of ${data.threadsWithGuestMessages} threads`}
        />
        <Stat
          label="Written by a person"
          value={formatDuration(data.medianFirstResponseSec)}
          note={`target ${formatDuration(slaTargetSec)}`}
          tone={data.medianFirstResponseSec <= slaTargetSec ? "positive" : "caution"}
        />
        <Stat
          label="Inside target"
          value={formatPct(data.withinSlaPct, 0)}
          note={
            data.longWaitingCount > 0
              ? `${data.longWaitingCount} waiting over an hour`
              : "nobody waiting over an hour"
          }
          tone={data.longWaitingCount > 0 ? "caution" : "positive"}
        />
      </div>

      <ul className="divide-y divide-hairline">
        {data.byMember.map((member) => {
          const late = member.medianResponseSec > slaTargetSec;
          return (
            <li key={member.memberId} className="flex items-center gap-2.5 px-4 py-2">
              <Avatar
                initials={initials(member.name)}
                tone={toneForName(member.name)}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-body font-medium text-text-primary">{member.name}</p>
                  <p
                    data-numeric
                    className={cn(
                      "shrink-0 text-meta font-medium",
                      late ? "text-caution-700" : "text-text-secondary",
                    )}
                  >
                    {formatDuration(member.medianResponseSec)}
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  {/* Length is the median reply time against the slowest person
                      on the desk, so the bar answers "who is holding this up"
                      rather than restating the number beside it. */}
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        late ? "bg-caution-500" : "bg-positive-500",
                      )}
                      style={{ width: `${(member.medianResponseSec / slowest) * 100}%` }}
                    />
                  </div>
                  <p data-numeric className="shrink-0 text-micro text-text-muted">
                    {member.handled} handled · {formatPct(member.withinSlaPct, 0)} on time
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "positive" | "caution";
}) {
  return (
    <div className="px-4 py-2.5">
      <p className="text-meta text-text-muted">{label}</p>
      <p
        data-numeric
        className={cn(
          "mt-1 text-section font-semibold leading-none",
          tone === "positive"
            ? "text-positive-700"
            : tone === "caution"
              ? "text-caution-700"
              : "text-text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-micro text-text-muted">{note}</p>
    </div>
  );
}
