import { Phone, Mail, UserRound } from "lucide-react";

type Contact = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  phoneExt?: string | null;
  email?: string | null;
};

type Official = {
  name?: string | null;
  role?: string | null;
  affiliation?: string | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function StudyContacts({
  contacts,
  officials,
}: {
  contacts?: unknown;
  officials?: unknown;
}) {
  const people = asArray<Contact>(contacts).filter((c) => c && (c.name || c.phone || c.email));
  const leads = asArray<Official>(officials).filter((o) => o && o.name);

  if (people.length === 0 && leads.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <UserRound className="h-4 w-4" /> Study contacts
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        People who can answer questions about joining this study, as published by the study sponsor.
      </p>

      {people.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((c, i) => (
            <li key={i} className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="font-medium">{c.name ?? "Study contact"}</p>
              {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
              <div className="mt-2 space-y-1 text-sm">
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone}
                    {c.phoneExt ? ` ext ${c.phoneExt}` : ""}
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="flex items-center gap-2 break-all text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {c.email}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {leads.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Principal investigators
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {leads.map((o, i) => (
              <li key={i}>
                <span className="font-medium">{o.name}</span>
                {o.role ? <span className="text-muted-foreground"> · {o.role}</span> : null}
                {o.affiliation ? (
                  <span className="text-muted-foreground"> — {o.affiliation}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
