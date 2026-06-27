import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

type Location = {
  id: string | number;
  facility: string | null;
  city: string | null;
  state: string | null;
  state_slug?: string | null;
  zip: string | null;
  country: string | null;
  status: string | null;
};

export function LocationsList({ locations }: { locations: Location[] }) {
  const [stateFilter, setStateFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");

  const states = useMemo(
    () => Array.from(new Set(locations.map((l) => l.state).filter(Boolean) as string[])).sort(),
    [locations],
  );

  const filtered = useMemo(() => {
    return locations.filter((l) => {
      if (stateFilter && l.state !== stateFilter) return false;
      if (zipFilter) {
        const zp = zipFilter.replace(/\D/g, "");
        if (zp.length >= 2 && !(l.zip ?? "").startsWith(zp)) return false;
      }
      return true;
    });
  }, [locations, stateFilter, zipFilter]);

  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">No specific research sites listed.</p>;
  }

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={zipFilter}
            onChange={(e) => setZipFilter(e.target.value)}
            placeholder="Filter by ZIP code"
            inputMode="numeric"
            maxLength={5}
            className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(stateFilter || zipFilter) && (
          <button
            type="button"
            onClick={() => {
              setStateFilter("");
              setZipFilter("");
            }}
            className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Showing {filtered.length} of {locations.length} site{locations.length === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-border">
        {filtered.slice(0, 60).map((l) => (
          <li key={l.id} className="flex items-start gap-3 py-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-medium">{l.facility || "Research site"}</p>
              <p className="text-muted-foreground">
                {[l.city, l.state, l.zip, l.country].filter(Boolean).join(", ")}
              </p>
              {l.status && <p className="mt-0.5 text-xs text-muted-foreground">Status: {l.status}</p>}
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No sites match these filters.</p>
      )}
    </div>
  );
}
