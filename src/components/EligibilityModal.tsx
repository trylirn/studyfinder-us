import { useMemo, useState } from "react";
import { X, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { parseEligibility, scoreEligibility, type Answer } from "@/lib/eligibility-parser";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  nctId: string;
  trialTitle: string;
  eligibilitySnippet?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  studySex?: string | null;
  recruiting: boolean;
  contactAnchor?: string; // hash target on the same page for follow-up
};

export function EligibilityModal({
  open,
  onClose,
  nctId,
  trialTitle,
  eligibilitySnippet,
  minAge,
  maxAge,
  studySex,
  recruiting,
  contactAnchor = "#study-contacts",
}: Props) {
  const parsed = useMemo(() => parseEligibility(eligibilitySnippet ?? null), [eligibilitySnippet]);
  const [step, setStep] = useState(0);
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not">("prefer_not");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  function close() {
    setStep(0);
    setAge("");
    setGender("prefer_not");
    setAnswers({});
    setSubmitted(false);
    onClose();
  }

  const result = submitted
    ? scoreEligibility({
        age: age === "" ? null : Number(age),
        gender,
        minAge: minAge ?? null,
        maxAge: maxAge ?? null,
        studySex: studySex ?? null,
        recruiting,
        answers,
        questions: parsed.questions,
      })
    : null;

  function ageOk() {
    if (age === "") return true; // skip is allowed
    const n = Number(age);
    return Number.isFinite(n) && n >= 0 && n < 120;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
      <div className="relative w-full max-w-lg rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {result ? (
          result.ok ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h3 className="mt-3 text-lg font-semibold">You may be a match.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your answers, you appear to meet the basic criteria for this trial. The study team makes the
                final determination.
              </p>
              <a
                href={contactAnchor}
                onClick={() => {
                  track({ event_type: "lead_eligibility", nct_id: nctId, meta: { result: "pass" } });
                  close();
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Contact the study team <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                Your answers stayed on this device. Nothing was submitted or stored.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
              <h3 className="mt-3 text-lg font-semibold">Likely not a match for this trial</h3>
              <ul className="mt-2 space-y-1 text-left text-sm text-muted-foreground">
                {result.reasons.slice(0, 5).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                This is a self-check, not a medical decision. Talk to your doctor about other trials.
              </p>
              <button onClick={close} className="mt-5 rounded-md border border-border bg-card px-4 py-2 text-sm">
                Close
              </button>
            </div>
          )
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Private self-check — answers stay on your device.
            </div>
            <h3 className="text-base font-semibold leading-snug">Check eligibility</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{trialTitle}</p>

            <div className="mt-4 flex gap-1">
              {[0, 1].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="mt-5 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {step === 0 && (
                <div className="space-y-3">
                  <Label>Age</Label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <Label>Sex assigned at birth</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as typeof gender)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / intersex</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Used only to compare against this trial's eligibility. Not sent anywhere.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  {parsed.questions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      This trial does not publish structured criteria we can turn into questions. We'll base the result
                      on your age and sex only.
                    </p>
                  )}
                  {parsed.questions.map((q) => (
                    <div key={q.id} className="rounded-md border border-border bg-card p-3 text-sm">
                      <p className="font-medium">
                        <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {q.kind}
                        </span>
                        {q.question}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {(["yes", "no", "unsure"] as Answer[]).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAnswers((s) => ({ ...s, [q.id]: v }))}
                            className={`rounded-md border px-3 py-1 text-xs capitalize ${
                              answers[q.id] === v
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parsed.extra.length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Additional criteria to review with the study team</summary>
                      <ul className="mt-2 space-y-1">
                        {parsed.extra.slice(0, 20).map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (step === 0 ? close() : setStep(step - 1))}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {step === 0 ? "Cancel" : "Back"}
              </button>
              {step < 1 ? (
                <button
                  type="button"
                  disabled={!ageOk()}
                  onClick={() => setStep(step + 1)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  See result
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</label>;
}
