import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots/txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth\nDisallow: /api/\n\nSitemap: ${url.origin}/sitemap.xml\n`;
        return new Response(body, { headers: { "content-type": "text/plain" } });
      },
    },
  },
});
