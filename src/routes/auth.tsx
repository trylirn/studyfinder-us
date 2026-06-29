import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In | TrialFinderUS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    if (mode === "signin") {
      // Idempotent admin seed for the platform admin
      try { await fetch("/api/public/seed-admin", { method: "POST" }); } catch { /* ignore */ }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      navigate({ to: email.toLowerCase() === "nokunato@gmail.com" ? "/admin" : "/portal" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/portal` },
      });
      setBusy(false);
      if (error) return setMsg(error.message);
      setMsg("Account created. You can now sign in and submit a clinic claim from the portal.");
      setMode("signin");
    }
  }

  return (
    <div className="container mx-auto max-w-sm px-4 py-16">
      <div className="mb-4 inline-flex rounded-md border border-border bg-card p-1 text-xs">
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
          Clinic operator sign up
        </button>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signin" ? "Sign in" : "Create a clinic operator account"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Admin and approved clinic operators can sign in here."
          : "Run a research site? Create an account, then claim your clinic profile from the portal."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
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
    </div>
  );
}
