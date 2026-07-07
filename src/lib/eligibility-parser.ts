// Parses ClinicalTrials.gov eligibilityCriteria text into concrete yes/no
// questions. Pure client util — no PII, no network. Best-effort heuristic.

export type CriterionQuestion = {
  id: string;
  kind: "inclusion" | "exclusion";
  text: string; // The raw bullet
  question: string; // Displayed to user
};

export type ParsedCriteria = {
  inclusion: string[];
  exclusion: string[];
  questions: CriterionQuestion[];
  extra: string[]; // any bullets that didn't fit
};

const MAX_QUESTIONS = 12;

function splitBullets(section: string): string[] {
  return section
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*[-*•·]\s*/, "")
        .replace(/^\s*\d+[).:]\s*/, "")
        .trim(),
    )
    .filter((l) => l.length > 4 && l.length < 300);
}

export function parseEligibility(criteria: string | null | undefined): ParsedCriteria {
  const empty: ParsedCriteria = { inclusion: [], exclusion: [], questions: [], extra: [] };
  if (!criteria) return empty;

  const text = criteria.replace(/\r/g, "");
  // Locate headers loosely
  const incIdx = text.search(/inclusion criteria\s*:?/i);
  const excIdx = text.search(/exclusion criteria\s*:?/i);

  let incSection = "";
  let excSection = "";
  if (incIdx >= 0 && excIdx >= 0) {
    if (incIdx < excIdx) {
      incSection = text.slice(incIdx, excIdx);
      excSection = text.slice(excIdx);
    } else {
      excSection = text.slice(excIdx, incIdx);
      incSection = text.slice(incIdx);
    }
  } else if (incIdx >= 0) {
    incSection = text.slice(incIdx);
  } else if (excIdx >= 0) {
    excSection = text.slice(excIdx);
  } else {
    incSection = text;
  }

  const inclusion = splitBullets(incSection.replace(/inclusion criteria\s*:?/i, ""));
  const exclusion = splitBullets(excSection.replace(/exclusion criteria\s*:?/i, ""));

  const questions: CriterionQuestion[] = [];
  const extra: string[] = [];

  const incTake = Math.min(inclusion.length, Math.ceil(MAX_QUESTIONS / 2));
  const excTake = Math.min(exclusion.length, MAX_QUESTIONS - incTake);

  inclusion.slice(0, incTake).forEach((t, i) =>
    questions.push({
      id: `inc-${i}`,
      kind: "inclusion",
      text: t,
      question: t,
    }),
  );
  exclusion.slice(0, excTake).forEach((t, i) =>
    questions.push({
      id: `exc-${i}`,
      kind: "exclusion",
      text: t,
      question: t,
    }),
  );
  extra.push(...inclusion.slice(incTake), ...exclusion.slice(excTake));

  return { inclusion, exclusion, questions, extra };
}

export type Answer = "yes" | "no" | "unsure";

export type ScoreInput = {
  age: number | null;
  gender: "male" | "female" | "other" | "prefer_not" | null;
  minAge?: number | null;
  maxAge?: number | null;
  studySex?: string | null; // ALL | MALE | FEMALE
  recruiting: boolean;
  answers: Record<string, Answer>;
  questions: CriterionQuestion[];
};

export type ScoreResult =
  | { ok: true; matched: string[] }
  | { ok: false; reasons: string[] };

export function scoreEligibility(input: ScoreInput): ScoreResult {
  const reasons: string[] = [];
  if (!input.recruiting) reasons.push("This trial is not currently recruiting.");
  if (input.age != null && input.minAge != null && input.age < input.minAge)
    reasons.push(`Trial requires age ${input.minAge} or older.`);
  if (input.age != null && input.maxAge != null && input.age > input.maxAge)
    reasons.push(`Trial requires age ${input.maxAge} or younger.`);
  const s = (input.studySex ?? "ALL").toUpperCase();
  if (s !== "ALL" && input.gender && input.gender !== "prefer_not") {
    if (s !== input.gender.toUpperCase()) {
      reasons.push(`Trial is for ${input.studySex} participants only.`);
    }
  }
  const matched: string[] = [];
  for (const q of input.questions) {
    const a = input.answers[q.id];
    if (!a) continue;
    if (q.kind === "inclusion" && a === "no") {
      reasons.push(`Inclusion not met: ${q.text}`);
    } else if (q.kind === "exclusion" && a === "yes") {
      reasons.push(`Exclusion applies: ${q.text}`);
    } else if ((q.kind === "inclusion" && a === "yes") || (q.kind === "exclusion" && a === "no")) {
      matched.push(q.text);
    }
  }
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true, matched };
}
