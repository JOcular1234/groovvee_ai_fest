import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { listAllRegistrationsForAdmin } from "@/lib/registrations";

// Route handlers don't run layouts — the check must happen here.
// requireSectionAccess redirects unauthenticated requests to login and
// admins without events:view to the overview, so attendee data can only
// leave through a session holding the events grant.
// Values are visitor-supplied: a leading = + - @ (or tab/CR) would run as a
// formula in Excel/Sheets (CSV injection), so such cells get a ' prefix.
function csvCell(value: string | null): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
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
      csvCell(r.phone),
      csvCell(r.school),
      csvCell(r.city),
      csvCell(r.country),
      csvCell(r.organization),
      csvCell(r.confirmedAt ? "confirmed" : "pending"),
      csvCell(r.createdAt.toISOString()),
      csvCell(r.confirmedAt?.toISOString() ?? null),
    ].join(",")
  );
  const csv = [
    "name,email,phone,school,city,country,organization,status,registered_at,confirmed_at",
    ...rows,
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
