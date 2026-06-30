import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Hospital } from "lucide-react";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/clinics/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Clinic Operator Sign In | TrialFinderUS" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Sign in or create an account to claim and manage your clinical research site on TrialFinderUS." },
    ],
  }),
  component: ClinicAuthPage,
});

function ClinicAuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/portal" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/portal` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/portal" });
        } else {
          setMsg("Account created. You can sign in now.");
          setMode("signin");
        }
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Hospital className="h-6 w-6" />
        <span className="text-sm font-medium uppercase tracking-wider">For Clinics & Research Sites</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "signin" ? "Clinic operator sign in" : "Create a clinic operator account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Manage your clinic profile, claim research sites, and update recruiting information."
          : "Run a research site? Create an account to claim and manage your clinic listing."}
      </p>

      <div className="mt-6 inline-flex rounded-md border border-border bg-card p-1 text-xs">
        <button
          type="button"
          onClick={() => { setMode("signin"); setMsg(null); }}
          className={`rounded px-3 py-1.5 ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode("signup"); setMsg(null); }}
          className={`rounded px-3 py-1.5 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Work email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        {msg && <p className={`text-sm ${msg.startsWith("Account") ? "text-success" : "text-destructive"}`}>{msg}</p>}
        <button disabled={busy} className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-xs text-muted-foreground">
        Platform administrator? <Link to="/auth" className="text-primary hover:underline">Admin sign in</Link>
      </p>
    </div>
  );
}
