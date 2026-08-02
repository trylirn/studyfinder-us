/**
 * Lightweight, privacy-preserving behaviour tracker.
 * Stores only a random visitor id (localStorage) and session id (sessionStorage).
 * No PHI, no form answers, no IP handling on the client.
 */
import { trackEvents } from "@/lib/analytics.functions";

export type TrackEventType =
  | "page_view"
  | "search"
  | "impression"
  | "listing_click"
  | "lead_call"
  | "lead_website"
  | "lead_directions"
  | "lead_eligibility";

export type TrackPayload = {
  path?: string | null;
  query?: string | null;
  city_slug?: string | null;
  state_slug?: string | null;
  condition_slug?: string | null;
  clinic_id?: string | null;
  nct_id?: string | null;
  meta?: Record<string, unknown>;
};

const VISITOR_KEY = "tf_visitor_id";
const SESSION_KEY = "tf_session_id";

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ids() {
  if (typeof window === "undefined") return null;
  try {
    let visitor = window.localStorage.getItem(VISITOR_KEY);
    if (!visitor) {
      visitor = uuid();
      window.localStorage.setItem(VISITOR_KEY, visitor);
    }
    let session = window.sessionStorage.getItem(SESSION_KEY);
    if (!session) {
      session = uuid();
      window.sessionStorage.setItem(SESSION_KEY, session);
    }
    return { visitor, session };
  } catch {
    return null;
  }
}

type QueuedEvent = Record<string, unknown>;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const seenImpressions = new Set<string>();

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const events = queue.slice(0, 40);
  queue = queue.slice(40);
  void trackEvents({ data: { events } as never }).catch(() => {
    // Navigation can abort an in-flight request. Requeue once the page is visible again.
    queue = [...events, ...queue].slice(0, 200);
    if (document.visibilityState === "visible") schedule();
  });
  if (queue.length > 0) schedule();
}

function schedule() {
  if (timer) return;
  timer = setTimeout(flush, 1500);
}

export function track(event: TrackEventType, payload: TrackPayload = {}) {
  if (typeof window === "undefined") return;
  const id = ids();
  if (!id) return;
  const path = payload.path ?? window.location.pathname + window.location.search;
  const pathname = path.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  const inferred: TrackPayload = {};
  if (segments[0] === "cities") inferred.city_slug = segments[1] ?? null;
  if (segments[0] === "states") inferred.state_slug = segments[1] ?? null;
  if (segments[0] === "conditions") inferred.condition_slug = segments[1] ?? null;
  if (segments[0] === "studies") inferred.nct_id = segments[1] ?? null;
  queue.push({
    event_type: event,
    path,
    query: payload.query ?? null,
    city_slug: payload.city_slug ?? inferred.city_slug ?? null,
    state_slug: payload.state_slug ?? inferred.state_slug ?? null,
    condition_slug: payload.condition_slug ?? inferred.condition_slug ?? null,
    clinic_id: payload.clinic_id ?? null,
    nct_id: payload.nct_id ?? inferred.nct_id ?? null,
    referrer: document.referrer ? document.referrer.slice(0, 500) : null,
    is_mobile: window.matchMedia("(max-width: 768px)").matches,
    session_id: id.session,
    visitor_id: id.visitor,
    meta: payload.meta ?? {},
  });
  if (event !== "impression" && event !== "page_view") flush();
  else schedule();
}

/** Records one impression per listing per page view (deduplicated). */
export function trackImpressions(items: TrackPayload[], source?: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  for (const item of items.slice(0, 40)) {
    const key = `${path}|${item.nct_id ?? ""}|${item.clinic_id ?? ""}|${item.city_slug ?? ""}`;
    if (seenImpressions.has(key)) continue;
    seenImpressions.add(key);
    track("impression", { ...item, meta: { ...(item.meta ?? {}), source: source ?? undefined } });
  }
}

export function initTracking() {
  if (typeof window === "undefined") return () => {};
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && queue.length > 0) schedule();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function resetImpressionCache() {
  seenImpressions.clear();
}
