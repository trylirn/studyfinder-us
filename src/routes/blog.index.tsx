import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listPosts } from "@/lib/posts.functions";

const postsQuery = { queryKey: ["posts"] as const, queryFn: () => listPosts() };

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery),
  head: () => ({
    meta: [
      { title: "Clinical Research Journal | TrialFinderUS" },
      { name: "description", content: "Plain-English news, explainers, and research updates from TrialFinderUS." },
      { property: "og:title", content: "Clinical Research Journal | TrialFinderUS" },
      { property: "og:description", content: "Plain-English news, explainers, and research updates from TrialFinderUS." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://studyfinder-us.lovable.app/blog" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Clinical Research Journal | TrialFinderUS" },
      { name: "twitter:description", content: "Plain-English news, explainers, and research updates from TrialFinderUS." },
    ],
    links: [{ rel: "canonical", href: "https://studyfinder-us.lovable.app/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQuery);
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">The TrialFinderUS journal</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Clinical research, made clearer.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">News, explainers, and practical guides about finding and understanding clinical trials.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {post.category && <span className="font-medium text-primary">{post.category}</span>}
              {post.published_at && <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString()}</time>}
            </div>
            <h2 className="mt-3 text-xl font-semibold"><Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">{post.title}</Link></h2>
            {post.excerpt && <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>}
            {post.author && <p className="mt-4 text-xs text-muted-foreground">By {post.author}</p>}
          </article>
        ))}
      </div>
      {posts.length === 0 && <p className="mt-10 text-sm text-muted-foreground">New articles will appear here soon.</p>}
    </div>
  );
}