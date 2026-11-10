import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { AdminModel } from "@/lib/generated/prisma/models";
import {
  hashPassword,
  normalizeEmail,
  passwordIssues,
} from "@/lib/auth/password";

export class ProvisionError extends Error {
  constructor(
    public code: "already_exists" | "weak_password" | "invalid_email",
    message: string,
    public details?: string[]
  ) {
    super(message);
  }
}

// Creates the first SUPER_ADMIN atomically. A transaction-scoped advisory
// lock makes concurrent invocations safe: the second caller blocks, then
// sees the committed Super Admin and refuses.
export async function provisionSuperAdmin(
  db: PrismaClient,
  input: { name: string; email: string; password: string }
): Promise<AdminModel> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new ProvisionError("invalid_email", "Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProvisionError("invalid_email", "Invalid email address");
  }

  const issues = passwordIssues(input.password);
  if (issues.length > 0) {
    throw new ProvisionError("weak_password", "Password too weak", issues);
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('super_admin_provision'))`;

        const existing = await tx.admin.findFirst({
          where: { role: "SUPER_ADMIN" },
          select: { id: true },
        });
        if (existing) {
          throw new ProvisionError(
            "already_exists",
            "A Super Admin already exists"
          );
        }

        return tx.admin.create({
          data: {
            name,
            email,
            passwordHash,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        });
      },
      { maxWait: 15_000, timeout: 20_000 }
    );
  } catch (err) {
    const inner = findProvisionError(err);
    throw inner ?? err;
  }
}

// Errors thrown inside interactive transactions may be wrapped by the
// driver (e.g. AggregateError); a P2002 unique violation on the partial
// index also means a Super Admin already exists.
function findProvisionError(err: unknown): ProvisionError | null {
  if (err instanceof ProvisionError) return err;
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  ) {
    return new ProvisionError("already_exists", "A Super Admin already exists");
  }
  if (err instanceof AggregateError) {
    for (const e of err.errors) {
      const found = findProvisionError(e);
      if (found) return found;
    }
  }
  const cause = (err as { cause?: unknown })?.cause;
  return cause ? findProvisionError(cause) : null;
}
