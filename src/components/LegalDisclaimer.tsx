import { AlertTriangle } from "lucide-react";

export function LegalDisclaimer({ variant = "block" }: { variant?: "block" | "inline" }) {
  if (variant === "inline") {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Informational only — not medical advice. We do not recommend specific treatments, diagnose, or
        provide a doctor-patient relationship. Always consult a licensed physician before making
        medical decisions. By submitting your information you consent to share it with the selected
        research site for the sole purpose of pre-screening for this trial.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-xs leading-5 text-foreground/80">
      <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" /> Important medical disclaimer
      </div>
      <p>
        TrialFinderUS is an independent informational directory. We are not affiliated with the U.S.
        Government or ClinicalTrials.gov. Information on this site is provided for general
        educational purposes only and is <strong>not medical advice, diagnosis, or treatment</strong>.
        We do not recommend specific therapies or trials and no doctor-patient relationship is
        created. Always consult a licensed physician before starting, stopping, or changing any
        medical treatment. TrialFinderUS may receive a referral fee from research sites for verified
        patient introductions.
      </p>
    </div>
  );
}
