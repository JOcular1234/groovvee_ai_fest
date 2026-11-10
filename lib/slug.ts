// Shared slug utilities — used by every entity with a unique public slug
// (topics, communities, events, competitions, news posts).

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export class SlugConflictError extends Error {
  readonly slug: string;
  constructor(slug: string) {
    super("slug_taken");
    this.slug = slug;
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

// Finds a free slug for `base` by appending -2, -3… until `isTaken` says no.
// Concurrent writers are still guarded by the DB unique constraint — callers
// must also handle P2002 on insert (see topics/communities services).
export async function uniqueSlug(
  isTaken: (slug: string) => Promise<boolean>,
  base: string
): Promise<string> {
  const root = slugify(base) || "item";
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await isTaken(candidate))) return candidate;
  }
}
