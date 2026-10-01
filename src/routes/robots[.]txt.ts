import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
         const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth\nDisallow: /api/\n\nSitemap: https://studyfinder-us.lovable.app/sitemap.xml\n`;
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
