/** Public visitor tracking is intentionally disabled. */
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

export function track(_event: TrackEventType, _payload: TrackPayload = {}) {}
export function trackImpressions(_items: TrackPayload[], _source?: string) {}
export function initTracking() { return () => {}; }
export function resetImpressionCache() {}