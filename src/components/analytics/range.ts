export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "custom";

export type Range = { from: string; to: string; key: RangeKey; label: string };

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildRange(key: RangeKey, customFrom?: string, customTo?: string): Range {
  const now = new Date();
  const today = startOfDay(now);
  const label = RANGE_OPTIONS.find((o) => o.key === key)?.label ?? "Last 7 days";
  const day = 24 * 60 * 60 * 1000;

  switch (key) {
    case "today":
      return { key, label, from: today.toISOString(), to: new Date(today.getTime() + day).toISOString() };
    case "yesterday":
      return { key, label, from: new Date(today.getTime() - day).toISOString(), to: today.toISOString() };
    case "30d":
      return {
        key,
        label,
        from: new Date(today.getTime() - 29 * day).toISOString(),
        to: new Date(today.getTime() + day).toISOString(),
      };
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { key, label, from: from.toISOString(), to: new Date(today.getTime() + day).toISOString() };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 1);
      return { key, label, from: from.toISOString(), to: to.toISOString() };
    }
    case "custom": {
      const f = customFrom ? new Date(customFrom + "T00:00:00") : new Date(today.getTime() - 6 * day);
      const t = customTo ? new Date(customTo + "T00:00:00") : today;
      return { key, label, from: f.toISOString(), to: new Date(t.getTime() + day).toISOString() };
    }
    case "7d":
    default:
      return {
        key: "7d",
        label: "Last 7 days",
        from: new Date(today.getTime() - 6 * day).toISOString(),
        to: new Date(today.getTime() + day).toISOString(),
      };
  }
}

export const LEAD_LABELS: Record<string, string> = {
  lead_call: "Called the clinic",
  lead_website: "Visited provider website",
  lead_directions: "Got directions",
  lead_eligibility: "Checked eligibility",
};

export const EVENT_LABELS: Record<string, string> = {
  page_view: "viewed a page",
  search: "searched",
  impression: "saw a listing",
  listing_click: "opened a listing",
  ...LEAD_LABELS,
};

export function num(n: unknown) {
  return Number(n ?? 0).toLocaleString();
}

export function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${((a / b) * 100).toFixed(1)}%`;
}

export function delta(current: number, previous: number) {
  if (!previous) return current > 0 ? "new" : "0%";
  const d = ((current - previous) / previous) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}
