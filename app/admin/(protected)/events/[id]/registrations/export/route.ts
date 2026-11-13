import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { listAllRegistrationsForAdmin } from "@/lib/registrations";

// Route handlers don't run layouts — the check must happen here.
// requireSectionAccess redirects unauthenticated requests to login and
// admins without events:view to the overview, so attendee data can only
// leave through a session holding the events grant.
function csvCell(value: string | null): string {
  const v = value ?? "";
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSectionAccess("events", "view");
  const { id } = await params;

  const [event, registrations] = await withDbRetry(() =>
    Promise.all([
      getEventById(db, id),
      listAllRegistrationsForAdmin(db, id),
    ])
  );
  if (!event) return new Response("Not found", { status: 404 });

  const rows = registrations.map((r) =>
    [
      csvCell(r.name),
      csvCell(r.email),
      csvCell(r.organization),
      csvCell(r.createdAt.toISOString()),
    ].join(",")
  );
  const csv = ["name,email,organization,registered_at", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
