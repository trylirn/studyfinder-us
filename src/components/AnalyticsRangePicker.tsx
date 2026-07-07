import { useMemo } from "react";

export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export type RangeValue = { key: RangeKey; from: string; to: string };

function iso(d: Date) { return d.toISOString(); }
function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function endOfDay(d: Date) { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; }

export function resolveRange(key: RangeKey, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  if (key === "today") return { from: iso(startOfDay(now)), to: iso(endOfDay(now)) };
  if (key === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: iso(startOfDay(y)), to: iso(endOfDay(y)) };
  }
  if (key === "7d") return { from: iso(new Date(Date.now() - 7 * 86400000)), to: iso(now) };
  if (key === "30d") return { from: iso(new Date(Date.now() - 30 * 86400000)), to: iso(now) };
  if (key === "this_month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: iso(s), to: iso(now) };
  }
  if (key === "last_month") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: iso(s), to: iso(e) };
  }
  if (key === "custom" && customFrom && customTo) {
    return { from: iso(startOfDay(new Date(customFrom))), to: iso(endOfDay(new Date(customTo))) };
  }
  return { from: iso(new Date(Date.now() - 7 * 86400000)), to: iso(now) };
}

export function AnalyticsRangePicker({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}) {
  const options: { key: RangeKey; label: string }[] = useMemo(() => [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
    { key: "custom", label: "Custom" },
  ], []);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => {
            if (o.key === "custom") {
              onChange({ key: "custom", from: value.from, to: value.to });
            } else {
              const r = resolveRange(o.key);
              onChange({ key: o.key, ...r });
            }
          }}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            value.key === o.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
      {value.key === "custom" && (
        <>
          <input
            type="date"
            value={value.from.slice(0, 10)}
            onChange={(e) => onChange({ ...value, ...resolveRange("custom", e.target.value, value.to.slice(0, 10)) })}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={value.to.slice(0, 10)}
            onChange={(e) => onChange({ ...value, ...resolveRange("custom", value.from.slice(0, 10), e.target.value) })}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          />
        </>
      )}
    </div>
  );
}
