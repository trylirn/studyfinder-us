import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
        const origin = new URL(request.url).origin;
        const urls: { loc: string; priority?: number }[] = [
          { loc: "/", priority: 1.0 },
          { loc: "/conditions", priority: 0.9 },
          { loc: "/states", priority: 0.9 },
          { loc: "/sponsors", priority: 0.8 },
          { loc: "/recruiting", priority: 0.9 },
          { loc: "/learn", priority: 0.6 },
        ];
        for (const p of ["1", "2", "3", "4"]) urls.push({ loc: `/phase/${p}`, priority: 0.7 });

        const [conds, states, cities, sponsors, studies] = await Promise.all([
          sb.from("conditions").select("slug").order("study_count", { ascending: false }).limit(2000),
          sb.from("states").select("slug"),
          sb.from("cities").select("slug").order("study_count", { ascending: false }).limit(2000),
          sb.from("sponsors").select("slug").order("study_count", { ascending: false }).limit(2000),
          sb.from("studies").select("nct_id").order("last_update_posted", { ascending: false, nullsFirst: false }).limit(40000),
        ]);
        for (const c of conds.data ?? []) urls.push({ loc: `/conditions/${c.slug}`, priority: 0.7 });
        for (const s of states.data ?? []) urls.push({ loc: `/states/${s.slug}`, priority: 0.7 });
        for (const c of cities.data ?? []) urls.push({ loc: `/cities/${c.slug}`, priority: 0.6 });
        for (const s of sponsors.data ?? []) urls.push({ loc: `/sponsors/${s.slug}`, priority: 0.6 });
        for (const s of studies.data ?? []) urls.push({ loc: `/studies/${s.nct_id}`, priority: 0.5 });

        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map((u) => `<url><loc>${origin}${u.loc}</loc>${u.priority ? `<priority>${u.priority}</priority>` : ""}</url>`)
            .join("\n") +
          `\n</urlset>`;
        return new Response(body, { headers: { "content-type": "application/xml" } });
      },
    },
  },
});
