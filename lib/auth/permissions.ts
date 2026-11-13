// Single source of truth for section-level admin access control.
//
// Every admin section grants two levels:
//   view   — read the section's screens (list, detail, exports)
//   manage — mutate within the section (create, edit, delete, review)
// Manage implies view. Grants are stored on Admin.permissions as
// "<section>:view" / "<section>:manage" strings. SUPER_ADMIN bypasses all
// checks and always has full access.

export const ADMIN_SECTIONS = [
  { key: "speakers", label: "Speakers", href: "/admin/speakers" },
  { key: "topics", label: "Topics", href: "/admin/topics" },
  { key: "communities", label: "Communities", href: "/admin/communities" },
  { key: "events", label: "Events", href: "/admin/events" },
  { key: "agenda", label: "Agenda", href: "/admin/agenda" },
  { key: "news", label: "News", href: "/admin/news" },
  { key: "competitions", label: "Competitions", href: "/admin/competitions" },
  { key: "applications", label: "Applications", href: "/admin/applications" },
  { key: "hack-wars", label: "Hack Wars", href: "/admin/hack-wars" },
  { key: "messages", label: "Messages", href: "/admin/messages" },
  { key: "discoveries", label: "Discoveries", href: "/admin/discoveries" },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];
export type AccessLevel = "view" | "manage";

const SECTION_KEYS = new Set<string>(ADMIN_SECTIONS.map((s) => s.key));

export function isAdminSection(key: string): key is AdminSection {
  return SECTION_KEYS.has(key);
}

type Permissioned = { role: string; permissions: string[] };

export function hasSectionAccess(
  admin: Permissioned,
  section: AdminSection,
  level: AccessLevel
): boolean {
  if (admin.role === "SUPER_ADMIN") return true;
  if (admin.permissions.includes(`${section}:manage`)) return true;
  return level === "view" && admin.permissions.includes(`${section}:view`);
}

// The granted level for a section — used to preselect the access editor
// and to render compact summaries in the admins list.
export function sectionAccessLevel(
  admin: Permissioned,
  section: AdminSection
): "none" | AccessLevel {
  if (admin.role === "SUPER_ADMIN") return "manage";
  if (admin.permissions.includes(`${section}:manage`)) return "manage";
  if (admin.permissions.includes(`${section}:view`)) return "view";
  return "none";
}

export function visibleSections(admin: Permissioned) {
  return ADMIN_SECTIONS.filter((s) => hasSectionAccess(admin, s.key, "view"));
}

// Reads "perm_<section>" fields ("none" | "view" | "manage") from form data
// and produces the canonical stored permission list. Unknown sections and
// values are dropped — whatever the client sends, only real grants survive.
export function permissionsFromForm(formData: FormData): string[] {
  const permissions: string[] = [];
  for (const s of ADMIN_SECTIONS) {
    const value = formData.get(`perm_${s.key}`);
    if (value === "view" || value === "manage") {
      permissions.push(`${s.key}:${value}`);
    }
  }
  return permissions;
}

// Sanitizes a raw string list (e.g. from a DB row or API payload) down to
// canonical permission keys — a stored "x:manage" or "x:view" only counts
// when x is a real section.
export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const [section, level] = item.split(":");
    if (isAdminSection(section) && (level === "view" || level === "manage")) {
      out.push(`${section}:${level}`);
    }
  }
  return [...new Set(out)];
}
