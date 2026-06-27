import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { simplifyStudyText } from "@/lib/ai.functions";
import { Sparkles, Loader2 } from "lucide-react";

export function AiSimplify({
  nctId,
  section,
  text,
}: {
  nctId: string;
  section: "summary" | "description" | "eligibility";
  text: string;
}) {
  const fn = useServerFn(simplifyStudyText);
  const [simple, setSimple] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fn({ data: { nctId, section, text } });
      setSimple(res.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!simple) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Simplifying…" : "Simplify with AI"}
        </button>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI plain-language version
        </span>
        <button
          type="button"
          onClick={() => setShowOriginal((s) => !s)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {showOriginal ? "Hide original" : "Show original"}
        </button>
      </div>
      <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{simple}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        AI-generated summary. Not medical advice.
      </p>
      {showOriginal && (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-border bg-card p-2 font-sans text-xs leading-5 text-foreground/80">
          {text}
        </pre>
      )}
    </div>
  );
}
