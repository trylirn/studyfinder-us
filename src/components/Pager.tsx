type Props = {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
  maxButtons?: number;
};

export function Pager({ page, total, pageSize, onChange, maxButtons = 10 }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const window = Math.min(maxButtons, totalPages);
  const start = Math.max(1, Math.min(page - Math.floor(window / 2), totalPages - window + 1));
  const buttons = Array.from({ length: window }, (_, i) => start + i);

  return (
    <div className="mt-8 flex items-center justify-center gap-1 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-border bg-card px-3 py-1.5 disabled:opacity-40"
      >
        ‹ Prev
      </button>
      {buttons.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-md border px-3 py-1.5 ${
            page === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-border bg-card px-3 py-1.5 disabled:opacity-40"
      >
        Next ›
      </button>
    </div>
  );
}
