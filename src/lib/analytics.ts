// Client-side analytics tracker. Fire-and-forget inserts using the anon
// Supabase client (INSERT policy allows anon). No PII, no cookies beyond a
// random session UUID kept in localStorage.
import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "search"
  | "impression"
  | "listing_click"
  | "lead_call"
  | "lead_website"
  | "lead_directions"
  | "lead_eligibility";

export type TrackInput = {
  event_type: EventType;
  city_slug?: string | null;
  state_slug?: string | null;
  condition_slug?: string | null;
  clinic_id?: string | null;
  nct_id?: string | null;
  query?: string | null;
  meta?: Record<string, unknown>;
};

const SESSION_KEY = "tfus_session_id";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto as Crypto).randomUUID();
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

function isMobile(): boolean | null {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  const uaMob = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const narrow = window.matchMedia?.("(max-width: 767px)")?.matches ?? false;
  return uaMob || narrow;
}

export function track(input: TrackInput): void {
  if (typeof window === "undefined") return;
  const row = {
    event_type: input.event_type,
    session_id: getSessionId(),
    path: window.location.pathname + window.location.search,
    is_mobile: isMobile(),
    city_slug: input.city_slug ?? null,
    state_slug: input.state_slug ?? null,
    condition_slug: input.condition_slug ?? null,
    clinic_id: input.clinic_id ?? null,
    nct_id: input.nct_id ?? null,
    query: input.query ?? null,
    referrer: document.referrer || null,
    meta: (input.meta ?? {}) as Record<string, unknown>,
  };
  // fire-and-forget
  void supabase.from("analytics_events").insert(row as never).then(() => {}, () => {});
}

// Debounce search events (avoid firing on every keystroke)
let searchTimer: ReturnType<typeof setTimeout> | null = null;
export function trackSearchDebounced(
  input: Omit<TrackInput, "event_type"> & { delayMs?: number },
) {
  if (searchTimer) clearTimeout(searchTimer);
  const delay = input.delayMs ?? 800;
  searchTimer = setTimeout(() => {
    track({ ...input, event_type: "search" });
  }, delay);
}
