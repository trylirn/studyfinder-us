import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getPost } from "@/lib/posts.functions";

const postQuery = (slug: string) => ({ queryKey: ["post", slug] as const, queryFn: () => getPost({ data: { slug } }) });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.seo_title || loaderData?.title || params.slug;
    const description = loaderData?.meta_description || loaderData?.excerpt || "Clinical research news and explainers from TrialFinderUS.";
    const url = `https://studyfinder-us.lovable.app/blog/${params.slug}`;
    return {
      meta: [
        { title: `${title} | TrialFinderUS` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQuery(slug));
  if (!post) return null;
  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">← Back to journal</Link>
      <header className="mt-6 border-b border-border pb-7">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.category && <span className="font-medium text-primary">{post.category}</span>}
          {post.published_at && <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString()}</time>}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>}
        {post.author && <p className="mt-4 text-sm text-muted-foreground">By {post.author}</p>}
      </header>
      <div className="prose prose-sm mt-8 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: post.content_html }} />
      {post.tags.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{tag}</span>)}</div>}
    </article>
  );
}