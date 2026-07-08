import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEligibilityLead } from "@/lib/eligibility.functions";
import { X, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { LegalDisclaimer } from "./LegalDisclaimer";

type Props = {
  open: boolean;
  onClose: () => void;
  nctId: string;
  trialTitle: string;
  conditions: string[];
  eligibilitySnippet?: string | null;
};

type Result =
  | null
  | { ok: true; delivered: boolean; channel: string }
  | { ok: false; reason: string };

export function EligibilityModal({ open, onClose, nctId, trialTitle, conditions, eligibilitySnippet }: Props) {
  const fn = useServerFn(submitEligibilityLead);
  const [step, setStep] = useState(0);
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not">("prefer_not");
  const [criteriaChecked, setCriteriaChecked] = useState<Record<string, boolean>>({});
  const [zip, setZip] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  if (!open) return null;

  const conditionQuestions = conditions
    .slice(0, 4)
    .map((c) => `I have been diagnosed with ${c}.`);

  function reset() {
    setStep(0);
    setAge("");
    setGender("prefer_not");
    setCriteriaChecked({});
    setZip("");
    setName("");
    setEmail("");
    setPhone("");
    setConsent(false);
    setError(null);
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const confirmed = Object.entries(criteriaChecked)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await fn({
        data: {
          nctId,
          age: Number(age),
          gender,
          zip,
          confirmedCriteria: confirmed,
          name,
          email,
          phone,
          consent: true,
        },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  function canNext(): boolean {
    if (step === 0) return age !== "" && Number(age) >= 0 && Number(age) < 120;
    if (step === 1) return true; // criteria optional
    if (step === 2) return /^\d{5}$/.test(zip);
    if (step === 3) return name.trim().length > 0 && /.+@.+\..+/.test(email) && phone.trim().length >= 7 && consent;
    return false;
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

        {result?.ok ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h3 className="mt-3 text-lg font-semibold">You may be a match.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We {result.delivered ? "sent your info securely to the research site" : "queued your info for the research site"}.
              They typically respond within 1–3 business days. Your responses were not stored on our servers.
            </p>
            <button onClick={close} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Done
            </button>
          </div>
        ) : result && !result.ok ? (
          <div className="py-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
            <h3 className="mt-3 text-lg font-semibold">Not a match for this trial</h3>
            <p className="mt-1 text-sm text-muted-foreground">{result.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This is a pre-screening tool, not a medical decision. Talk to your doctor about other options.
            </p>
            <button onClick={close} className="mt-5 rounded-md border border-border bg-card px-4 py-2 text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Stateless pre-screening — your responses are not saved.
            </div>
            <h3 className="text-base font-semibold leading-snug">Check eligibility</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{trialTitle}</p>

            <div className="mt-4 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="mt-5 space-y-4">
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
                  <Label>Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as typeof gender)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  <Label>Confirm any diagnoses that apply</Label>
                  {conditionQuestions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No specific diagnoses to confirm for this trial.</p>
                  )}
                  {conditionQuestions.map((q) => (
                    <label key={q} className="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!criteriaChecked[q]}
                        onChange={(e) => setCriteriaChecked((s) => ({ ...s, [q]: e.target.checked }))}
                        className="mt-0.5"
                      />
                      <span>{q}</span>
                    </label>
                  ))}
                  {eligibilitySnippet && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Full trial eligibility criteria</summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-sans">
                        {eligibilitySnippet.slice(0, 2000)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Label>ZIP code</Label>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="e.g. 02115"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">Used only to find the nearest research site.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <Label>Full name</Label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                  <Label>Email</Label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                  <Label>Phone</Label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                    <span>
                      I consent to share my answers and contact info with the research site for this trial. I understand
                      this is not medical advice and that TrialFinderUS will not store my responses.
                    </span>
                  </label>
                  <LegalDisclaimer variant="inline" />
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (step === 0 ? close() : setStep(step - 1))}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {step === 0 ? "Cancel" : "Back"}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep(step + 1)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canNext() || loading}
                  onClick={submit}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit
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
