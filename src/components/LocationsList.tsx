import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Search, ArrowRight, Phone, Mail, Navigation } from "lucide-react";
import { track } from "@/lib/analytics";

type LocationContact = { name?: string; role?: string; phone?: string; phoneExt?: string; email?: string };

type Location = {
  id: string | number;
  nct_id?: string | null;
  facility: string | null;
  city: string | null;
  state: string | null;
  state_slug?: string | null;
  zip: string | null;
  country: string | null;
  status: string | null;
  clinic_id?: string | null;
  clinic_slug?: string | null;
  contacts?: LocationContact[] | null;
  lat?: number | null;
  lng?: number | null;
};

type ClinicMap = Record<string, { slug: string; name: string }>;


export function LocationsList({
  locations,
  clinicMap,
}: {
  locations: Location[];
  clinicMap?: ClinicMap;
}) {
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

  const resolveSlug = (l: Location): string | null =>
    l.clinic_slug ?? (l.clinic_id ? clinicMap?.[l.clinic_id]?.slug ?? null : null);

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
            aria-label="Filter research sites by ZIP code"
            className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter research sites by state"
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
        {filtered.slice(0, 60).map((l) => {
          const slug = resolveSlug(l);
          const facility = l.facility || "Research site";
          const address = [l.city, l.state, l.zip, l.country].filter(Boolean).join(", ");

          if (slug) {
            return (
              <li key={l.id}>
                <Link
                  to="/clinics/$slug"
                  params={{ slug }}
                  aria-label={`View clinic profile for ${facility}`}
                  className="group flex items-start gap-3 py-3 text-sm transition hover:bg-muted/40 -mx-2 px-2 rounded-md"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium group-hover:text-primary">{facility}</p>
                    <p className="text-muted-foreground">{address}</p>
                    {l.status && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Status: {l.status}</p>
                    )}
                  </div>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    View profile <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={l.id} className="flex items-start gap-3 py-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium">{facility}</p>
                <p className="text-muted-foreground">{address}</p>
                {l.status && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Status: {l.status}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No sites match these filters.</p>
      )}
    </div>
  );
}
