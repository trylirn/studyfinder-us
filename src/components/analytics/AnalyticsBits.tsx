import { Link } from "@tanstack/react-router";
import { delta, num } from "./range";

export function KpiCard({
  label,
  value,
  previous,
  hint,
}: {
  label: string;
  value: number | string;
  previous?: number;
  hint?: string;
}) {
  const numericValue = typeof value === "number" ? value : null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">
        {typeof value === "number" ? num(value) : value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {numericValue !== null && previous !== undefined ? (
          <span>{delta(numericValue, previous)} vs previous period</span>
        ) : (
          hint
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type Column = { key: string; label: string; align?: "left" | "right" };

export function DataTable({
  columns,
  rows,
  emptyText = "No data for this period yet.",
  onRowClick,
  rowLink,
}: {
  columns: Column[];
  rows: Record<string, any>[];
  emptyText?: string;
  onRowClick?: (row: Record<string, any>) => void;
  rowLink?: (row: Record<string, any>) => { to: string; params?: Record<string, string> } | null;
}) {
  if (!rows || rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={`py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.key ?? i}
              className={`border-b border-border/60 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-accent/40" : ""}`}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => {
                const raw = r[c.key];
                const link = c.key === columns[0].key && rowLink ? rowLink(r) : null;
                const content =
                  typeof raw === "number" ? num(raw) : raw === null || raw === undefined ? "—" : String(raw);
                return (
                  <td
                    key={c.key}
                    className={`py-2 pr-3 align-top ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                  >
                    {link ? (
                      <Link to={link.to as never} params={link.params as never} className="text-primary hover:underline">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate pr-3 text-foreground">{i.label}</span>
            <span className="tabular-nums text-muted-foreground">{num(i.value)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
