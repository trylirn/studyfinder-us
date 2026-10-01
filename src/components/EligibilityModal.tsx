import { useState } from "react";
import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck, X } from "lucide-react";
import { LegalDisclaimer } from "./LegalDisclaimer";

type Location = {
  facility?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  trialTitle: string;
  conditions: string[];
  eligibilitySnippet?: string | null;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  gender?: string | null;
  overallStatus?: string | null;
  locations?: Location[];
};

type Result = null | { ok: true; site: Location | null } | { ok: false; reason: string };

export function EligibilityModal({
  open,
  onClose,
  trialTitle,
  conditions,
  eligibilitySnippet,
  minAgeYears,
  maxAgeYears,
  gender,
  overallStatus,
  locations = [],
}: Props) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [userGender, setUserGender] = useState<"male" | "female" | "other" | "prefer_not">("prefer_not");
  const [criteriaChecked, setCriteriaChecked] = useState<Record<string, boolean>>({});
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<Result>(null);

  if (!open) return null;

  const conditionQuestions = conditions.slice(0, 4).map((condition) => `I have been diagnosed with ${condition}.`);

  function reset() {
    setStep(0);
    setAge("");
    setUserGender("prefer_not");
    setCriteriaChecked({});
    setZip("");
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  function checkMatch() {
    const numericAge = Number(age);
    const reasons: string[] = [];
    if (overallStatus !== "RECRUITING") reasons.push("This trial is not currently recruiting.");
    if (minAgeYears != null && numericAge < minAgeYears) reasons.push(`This trial requires age ${minAgeYears} or older.`);
    if (maxAgeYears != null && numericAge > maxAgeYears) reasons.push(`This trial requires age ${maxAgeYears} or younger.`);

    const trialGender = (gender ?? "ALL").toUpperCase();
    if ((trialGender === "MALE" || trialGender === "FEMALE") && userGender !== "prefer_not" && userGender.toUpperCase() !== trialGender) {
      reasons.push(`This trial is listed for ${trialGender.toLowerCase()} participants.`);
    }

    if (reasons.length > 0) {
      setResult({ ok: false, reason: reasons.join(" ") });
      return;
    }

    const prefix = zip.slice(0, 2);
    const site = locations.find((location) => (location.zip ?? "").replace(/\D/g, "").startsWith(prefix)) ?? locations[0] ?? null;
    setResult({ ok: true, site });
  }

  function canNext() {
    if (step === 0) return age !== "" && Number(age) >= 0 && Number(age) < 120;
    if (step === 1) return true;
    return /^\d{5}$/.test(zip);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
      <div className="relative w-full max-w-lg rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>

        {result?.ok ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h3 className="mt-3 text-lg font-semibold">You may be a match.</h3>
            <p className="mt-1 text-sm text-muted-foreground">This anonymous check stays in your browser and does not send or save your answers.</p>
            {result.site && (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                {[result.site.facility, result.site.city, result.site.state, result.site.zip].filter(Boolean).join(", ")}
              </p>
            )}
            <button type="button" onClick={close} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Done</button>
          </div>
        ) : result && !result.ok ? (
          <div className="py-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
            <h3 className="mt-3 text-lg font-semibold">This trial may not be a match</h3>
            <p className="mt-1 text-sm text-muted-foreground">{result.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">This is a pre-screening tool, not a medical decision. Talk to your doctor about other options.</p>
            <button type="button" onClick={close} className="mt-5 rounded-md border border-border bg-card px-4 py-2 text-sm">Close</button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Anonymous browser-only check — your answers are not sent or saved.</div>
            <h3 className="text-base font-semibold leading-snug">Check eligibility</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{trialTitle}</p>

            <div className="mt-4 flex gap-1">{[0, 1, 2].map((index) => <div key={index} className={`h-1 flex-1 rounded ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>

            <div className="mt-5 space-y-4">
              {step === 0 && (
                <div className="space-y-3">
                  <Label>Age</Label>
                  <input type="number" min={0} max={120} value={age} onChange={(event) => setAge(event.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                  <Label>Gender</Label>
                  <select value={userGender} onChange={(event) => setUserGender(event.target.value as typeof userGender)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not">Prefer not to say</option>
                  </select>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  <Label>Confirm any diagnoses that apply</Label>
                  {conditionQuestions.length === 0 && <p className="text-xs text-muted-foreground">No specific diagnoses to confirm for this trial.</p>}
                  {conditionQuestions.map((question) => (
                    <label key={question} className="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-sm">
                      <input type="checkbox" checked={!!criteriaChecked[question]} onChange={(event) => setCriteriaChecked((state) => ({ ...state, [question]: event.target.checked }))} className="mt-0.5" />
                      <span>{question}</span>
                    </label>
                  ))}
                  {eligibilitySnippet && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Full trial eligibility criteria</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-sans">{eligibilitySnippet.slice(0, 2000)}</pre></details>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Label>ZIP code</Label>
                  <input inputMode="numeric" maxLength={5} value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="e.g. 02115" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                  <p className="text-xs text-muted-foreground">Used only in this browser to suggest a nearby listed site.</p>
                  <LegalDisclaimer variant="inline" />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button type="button" onClick={() => (step === 0 ? close() : setStep(step - 1))} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{step === 0 ? "Cancel" : "Back"}</button>
              {step < 2 ? <button type="button" disabled={!canNext()} onClick={() => setStep(step + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Next</button> : <button type="button" disabled={!canNext()} onClick={checkMatch} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Check match</button>}
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