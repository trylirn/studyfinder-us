import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

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
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-3 border-b border-border pb-3 text-sm">
        <Link to="/portal" className="text-muted-foreground hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground font-medium" }}>Dashboard</Link>
        <Link to="/portal/claim" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Claim a clinic</Link>
        <Link to="/portal/billing" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Premium placement</Link>
      </nav>
      <Outlet />
    </div>
  );
}
