import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

export function SearchBar({ initial = "", large = false }: { initial?: string; large?: boolean }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/search", search: { q: q.trim() || undefined } });
      }}
      className={`flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm ${large ? "md:p-3" : ""}`}
    >
      <Search className="ml-2 h-5 w-5 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by condition, treatment, sponsor, city, or NCT ID"
        className={`flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${large ? "h-12 text-base" : "h-10 text-sm"}`}
      />
      <button
        type="submit"
        className={`rounded-md bg-primary px-4 font-medium text-primary-foreground transition hover:bg-primary/90 ${large ? "h-12 text-base" : "h-10 text-sm"}`}
      >
        Search
      </button>
    </form>
  );
}
