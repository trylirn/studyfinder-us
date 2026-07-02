import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Clinic Portal | TrialFinderUS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PortalLayout,
});

function PortalLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      navigate({ to: "/clinics/auth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-3 border-b border-border pb-3 text-sm">
        <Link to="/portal" className="text-muted-foreground hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground font-medium" }}>Dashboard</Link>
        <Link to="/portal/claim" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Claim a clinic</Link>
        <Link to="/portal/billing" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Premium placement</Link>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {email && <span className="hidden sm:inline">{email}</span>}
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
