import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-semibold tracking-tight">TrialFinder<span className="text-primary">US</span></p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            The independent directory of clinical trials and research studies in the United States.
            Data is sourced from ClinicalTrials.gov.
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/learn" className="hover:text-primary">Learn about trials</Link></li>
            <li><Link to="/learn/$slug" params={{ slug: "how-to-participate" }} className="hover:text-primary">How to participate</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} TrialFinderUS. Not affiliated with the U.S. Government.</p>
          <p>This site is for informational purposes only and is not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}
