export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const PHASES = ["1", "2", "3", "4"] as const;
export type Phase = (typeof PHASES)[number];

export const STATUS_LABELS: Record<string, string> = {
  RECRUITING: "Recruiting",
  NOT_YET_RECRUITING: "Not yet recruiting",
  ACTIVE_NOT_RECRUITING: "Active, not recruiting",
  COMPLETED: "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by invitation",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  WITHDRAWN: "Withdrawn",
  UNKNOWN: "Unknown",
};

export function statusLabel(s?: string | null) {
  if (!s) return "Unknown";
  return STATUS_LABELS[s] ?? s.replace(/_/g, " ").toLowerCase();
}

export function phaseLabel(p?: string | null) {
  if (!p) return "N/A";
  // ClinicalTrials.gov returns things like "PHASE2", "PHASE1|PHASE2"
  return p
    .split("|")
    .map((x) => x.replace("PHASE", "Phase "))
    .join(" / ");
}
