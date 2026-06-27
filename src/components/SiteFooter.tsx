import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="font-semibold tracking-tight">TrialFinder<span className="text-primary">US</span></p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            The independent directory of clinical trials and research studies in the United States.
            Data is sourced from ClinicalTrials.gov. TrialFinderUS is not affiliated with the U.S.
            Government, the National Institutes of Health, or ClinicalTrials.gov.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browse</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/conditions" className="hover:text-primary">By condition</Link></li>
            <li><Link to="/states" className="hover:text-primary">By state</Link></li>
            <li><Link to="/sponsors" className="hover:text-primary">By sponsor</Link></li>
            <li><Link to="/recruiting" className="hover:text-primary">Recruiting now</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phases</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/phase/$phase" params={{ phase: "1" }} className="hover:text-primary">Phase 1 trials</Link></li>
            <li><Link to="/phase/$phase" params={{ phase: "2" }} className="hover:text-primary">Phase 2 trials</Link></li>
            <li><Link to="/phase/$phase" params={{ phase: "3" }} className="hover:text-primary">Phase 3 trials</Link></li>
            <li><Link to="/phase/$phase" params={{ phase: "4" }} className="hover:text-primary">Phase 4 trials</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal & About</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/legal/disclaimer" className="hover:text-primary">Medical disclaimer</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-primary">Privacy policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-primary">Terms of service</Link></li>
            <li><Link to="/learn" className="hover:text-primary">Learn about trials</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto space-y-2 px-4 py-5 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Medical disclaimer:</strong> TrialFinderUS provides information for
            general educational purposes only. Nothing on this site is medical advice, diagnosis, or treatment, and
            no doctor-patient relationship is created. We do not recommend specific trials, therapies, drugs, or
            procedures. Always seek the advice of a licensed physician before starting, stopping, or changing any
            medical care. TrialFinderUS may receive a referral fee from research sites for verified patient
            introductions, which never influences which trials we display.
          </p>
          <p>© {new Date().getFullYear()} TrialFinderUS. Not affiliated with the U.S. Government or ClinicalTrials.gov.</p>
        </div>
      </div>
    </footer>
  );
}
