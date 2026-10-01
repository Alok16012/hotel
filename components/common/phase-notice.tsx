import { Check, Hammer } from "lucide-react";
import { PageBody, PageHeader } from "./page-header";

/**
 * Placeholder for screens whose data layer lands in a later build phase.
 *
 * It states plainly what is not built yet and lists what will occupy the
 * screen. A convincing fake dashboard here would be the worst possible
 * outcome: it makes the build look finished and hides what still needs doing.
 */
export function PhaseNotice({
  title,
  description,
  phase,
  contents,
}: {
  title: string;
  description: string;
  /** Build phase this screen belongs to, e.g. "Phase D". */
  phase: string;
  /** What this screen will contain once built. */
  contents: string[];
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageBody>
        <div className="mx-auto max-w-2xl rounded-[var(--radius-surface)] border border-hairline bg-surface p-1">
          <div className="rounded-[calc(var(--radius-surface)-4px)] bg-surface-sunken/60 px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-ink-100 text-text-muted">
                <Hammer className="size-3.5" aria-hidden="true" />
              </span>
              <p className="text-card font-semibold text-text-primary">
                Scheduled for {phase}
              </p>
            </div>

            <p className="mt-2 text-body text-text-secondary">
              The application shell, navigation and design system are in place. This screen
              is routed and reachable, but its data surfaces have not been built yet.
            </p>

            <p className="mt-4 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
              Planned contents
            </p>
            <ul className="mt-2 space-y-1.5">
              {contents.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body text-text-secondary">
                  <Check
                    className="mt-[3px] size-3.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageBody>
    </>
  );
}
