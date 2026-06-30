import { Link } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </span>
          <span className="text-lg">TrialFinder<span className="text-primary">US</span></span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link to="/search" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Search</Link>
          <Link to="/conditions" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Conditions</Link>
          <Link to="/states" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>States</Link>
          <Link to="/sponsors" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Sponsors</Link>
          <Link to="/clinics" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Clinics</Link>
          <Link to="/recruiting" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Recruiting</Link>
          <Link to="/learn" className="hover:text-foreground" activeProps={{ className: "text-foreground" }}>Learn</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/search"
            className="hidden sm:inline-flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            Find a trial
          </Link>
          {signedIn ? (
            <Link
              to="/portal"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Clinic portal
            </Link>
          ) : (
            <>
              <Link
                to="/clinics/auth"
                className="hidden sm:inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm text-foreground hover:bg-accent"
              >
                Clinic sign in
              </Link>
              <Link
                to="/clinics/auth"
                search={{ mode: "signup" }}
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
