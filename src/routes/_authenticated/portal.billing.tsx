import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/billing")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Premium placement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Boost your clinic to the top of city, state, and condition pages and receive prioritized eligibility-tool leads.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          icon={<Sparkles className="h-5 w-5" />}
          name="Featured"
          price="$199 / mo"
          features={[
            "Pinned to the top of your state and city pages",
            "Featured badge on your clinic profile",
            "Priority intake email delivery for eligibility leads",
          ]}
        />
        <PlanCard
          icon={<Star className="h-5 w-5" />}
          name="Premium"
          price="$499 / mo"
          features={[
            "Everything in Featured",
            "Pinned across all matched condition pages",
            "Custom hero image + photo gallery",
            "Direct webhook delivery for leads",
          ]}
        />
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        Billing is launching soon. To express interest now, email <a href="mailto:partners@trialfinderus.example" className="text-primary underline">partners@trialfinderus.example</a> and we will manually enable a trial on your profile.
      </div>
    </div>
  );
}

function PlanCard({ icon, name, price, features }: { icon: React.ReactNode; name: string; price: string; features: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm font-semibold uppercase tracking-wider">{name}</span></div>
      <p className="mt-2 text-2xl font-semibold">{price}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {features.map((f) => <li key={f}>• {f}</li>)}
      </ul>
      <button disabled className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-3 text-xs opacity-60">Coming soon</button>
    </div>
  );
}
