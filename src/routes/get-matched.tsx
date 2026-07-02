import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listConditions } from "@/lib/directory.functions";
import { matchTrialSites } from "@/lib/match.functions";
import { MapPin, Search, ShieldCheck, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/get-matched")({
  head: () => ({
    meta: [
      { title: "Find a Clinical Trial Near You — Get Matched | TrialFinderUS" },
      { name: "description", content: "Answer a few quick questions to find clinical research sites near you that run trials for your condition. Nothing is stored — matching happens live." },
      { property: "og:title", content: "Get matched with clinical trials near you" },
      { property: "og:description", content: "Free, private matching — no account required." },
    ],
    links: [{ rel: "canonical", href: "/get-matched" }],
  }),
  component: GetMatchedPage,
});

const RADII = [10, 25, 50, 100, 200];
const PHASES = [
  { label: "Any phase", value: "" },
  { label: "Phase 1", value: "1" },
  { label: "Phase 2", value: "2" },
  { label: "Phase 3", value: "3" },
  { label: "Phase 4", value: "4" },
];

function GetMatchedPage() {
  const [step, setStep] = useState(1);
  const [conditionQuery, setConditionQuery] = useState("");
  const [conditionSlug, setConditionSlug] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(50);
  const [phase, setPhase] = useState("");
  const [recruitingOnly, setRecruitingOnly] = useState(true);

  const { data: conditions } = useQuery({
    queryKey: ["conditions-quiz", conditionQuery],
    queryFn: () => listConditions({ data: { q: conditionQuery, page: 1 } }),
    enabled: conditionQuery.length >= 2,
  });

  const match = useMutation({
    mutationFn: () =>
      matchTrialSites({ data: { condition: conditionSlug, zip, radius, phase, recruitingOnly } } as any),
  });

  const canNext1 = !!conditionSlug;
  const canNext2 = /^\d{5}$/.test(zip);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-medium uppercase tracking-wider">Free matching</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find trial sites near you</h1>
      <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success" /> Private and stateless — we don't save anything you enter.
      </p>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded ${step >= n ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">What condition are you looking to treat?</h2>
            <p className="text-sm text-muted-foreground">Start typing to search from our directory.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={conditionQuery}
              onChange={(e) => { setConditionQuery(e.target.value); setConditionSlug(""); }}
              placeholder="e.g. Type 2 diabetes, breast cancer, migraine…"
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
            {conditionQuery.length >= 2 && !conditionSlug && (
              <ul className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-card">
                {(conditions?.rows ?? []).slice(0, 20).map((c: any) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => { setConditionSlug(c.slug); setConditionName(c.name); setConditionQuery(c.name); }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">· {c.study_count} studies</span>
                    </button>
                  </li>
                ))}
                {(conditions?.rows ?? []).length === 0 && (
                  <li className="p-3 text-sm text-muted-foreground">No matches. Try a different term.</li>
                )}
              </ul>
            )}
            {conditionSlug && (
              <p className="mt-2 text-xs text-success">Selected: {conditionName}</p>
            )}
          </div>
          <StepNav
            onNext={() => setStep(2)}
            nextDisabled={!canNext1}
          />
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">Where are you located?</h2>
            <p className="text-sm text-muted-foreground">We'll find trial sites within your travel range.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Your ZIP code</label>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g. 10001"
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Max travel distance</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RADII.map((r) => <option key={r} value={r}>{r} miles</option>)}
              </select>
            </div>
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!canNext2}
          />
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">Refine your match</h2>
            <p className="text-sm text-muted-foreground">Optional preferences to narrow the results.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Study phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recruitingOnly}
                onChange={(e) => setRecruitingOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Only currently recruiting
            </label>
          </div>
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => { setStep(4); match.mutate(); }}
            nextLabel="Find matches"
          />
        </section>
      )}

      {step === 4 && (
        <section className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Your matches</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {conditionName} · within {radius} mi of {zip}
              <button type="button" onClick={() => setStep(1)} className="ml-3 text-primary underline">Change</button>
            </p>
          </div>

          {match.isPending && (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Searching nearby sites…</div>
          )}
          {match.error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(match.error as Error).message}
            </div>
          )}
          {match.data && match.data.ok === false && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">Couldn't match: {match.data.reason}</div>
          )}
          {match.data && match.data.ok && match.data.results.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No matching trial sites within {radius} miles. Try widening your travel distance, changing the condition, or removing filters.
            </div>
          )}
          {match.data && match.data.ok && match.data.results.length > 0 && (
            <ul className="space-y-3">
              {match.data.results.map((r: any) => (
                <li key={r.clinic.slug} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        to="/clinics/$slug"
                        params={{ slug: r.clinic.slug }}
                        className="text-base font-semibold hover:text-primary"
                      >
                        {r.clinic.name}
                      </Link>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[r.clinic.city, r.clinic.state].filter(Boolean).join(", ")} · {r.distance_mi.toFixed(1)} miles away
                      </p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {r.trial_count} matching trial{r.trial_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 border-t border-border pt-3">
                    {r.trials.map((t: any) => (
                      <li key={t.nct_id}>
                        <Link
                          to="/studies/$nctId"
                          params={{ nctId: t.nct_id }}
                          className="block text-sm hover:text-primary"
                        >
                          <span className="line-clamp-2">{t.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.overall_status}{t.phase ? ` · ${t.phase.replace(/PHASE/g, "Phase ")}` : ""}{t.sponsor_name ? ` · ${t.sponsor_name}` : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3 text-success" />
            Your answers are used only for this match. Nothing is stored on our servers.
          </p>
        </section>
      )}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:border-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
