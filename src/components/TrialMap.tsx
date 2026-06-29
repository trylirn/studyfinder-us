import { lazy, Suspense, useEffect, useState } from "react";
import type { MapPin } from "./TrialMapInner";

const Inner = lazy(() => import("./TrialMapInner"));

export function TrialMap({ pins, height }: { pins: MapPin[]; height?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/40"
        style={{ height: height ?? 360 }}
        aria-hidden
      />
    );
  }
  if (pins.length === 0) return null;
  return (
    <Suspense fallback={<div className="rounded-lg border border-border bg-muted/40" style={{ height: height ?? 360 }} />}>
      <Inner pins={pins} height={height} />
    </Suspense>
  );
}
