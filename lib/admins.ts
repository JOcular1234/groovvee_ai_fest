import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import {
  hashPassword,
  normalizeEmail,
  passwordIssues,
  verifyPassword,
} from "@/lib/auth/password";
import { sanitizePermissions } from "@/lib/auth/permissions";
import {
  revokeAllSessions,
  revokeOtherSessions,
} from "@/lib/auth/session";

export class AdminAccountError extends Error {
  constructor(
    public code:
      | "not_found"
      | "duplicate_email"
      | "weak_password"
      | "invalid_email"
      | "invalid_name"
      | "protected_target"
      | "wrong_password",
    message: string,
    public details?: string[]
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
  mustChangePassword: true,
  isActive: true,
  deactivatedAt: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export function listAdmins(db: PrismaClient) {
  return db.admin.findMany({
    select: adminSelect,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export function getAdminById(db: PrismaClient, id: string) {
  return db.admin.findUnique({ where: { id }, select: adminSelect });
}

export function listAuditLogsForAdmin(db: PrismaClient, targetId: string) {
  return db.adminAuditLog.findMany({
    where: { targetId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { name: true, email: true } } },
  });
}

async function writeAuditLog(
  db: PrismaClient,
  actorId: string,
  targetId: string,
  action: string,
  details?: Prisma.InputJsonObject
) {
  await db.adminAuditLog.create({
    data: { actorId, targetId, action, details: details ?? undefined },
  });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function validateName(raw: string): string {
  const name = raw.trim();
  if (!name || name.length > 120) {
    throw new AdminAccountError("invalid_name", "A valid name is required");
  }
  return name;
}

function validateEmail(raw: string): string {
  const email = normalizeEmail(raw);
  if (!EMAIL_RE.test(email)) {
    throw new AdminAccountError("invalid_email", "Invalid email address");
  }
  return email;
}

function validatePassword(password: string): void {
  const issues = passwordIssues(password);
  if (issues.length > 0) {
    throw new AdminAccountError("weak_password", "Password too weak", issues);
  }
}

// Only SUPER_ADMIN rows may be touched through provisioning; every account
// created here is a plain ADMIN whose access comes solely from its grants.
export async function createAdmin(
  db: PrismaClient,
  actorId: string,
  input: { name: string; email: string; password: string; permissions: string[] }
) {
  const name = validateName(input.name);
  const email = validateEmail(input.email);
  validatePassword(input.password);
  const permissions = sanitizePermissions(input.permissions);
  const passwordHash = await hashPassword(input.password);

  try {
    const admin = await db.admin.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        permissions,
        mustChangePassword: true,
        isActive: true,
      },
      select: adminSelect,
    });
    await writeAuditLog(db, actorId, admin.id, "admin.created", {
      email,
      permissions,
    });
    return admin;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AdminAccountError(
        "duplicate_email",
        "An admin with that email already exists"
      );
    }
    throw err;
  }
}

async function requireEditableTarget(db: PrismaClient, targetId: string) {
  const target = await db.admin.findUnique({ where: { id: targetId } });
  if (!target) throw new AdminAccountError("not_found", "Admin not found");
  // The single SUPER_ADMIN can never be modified through management
  // actions — this also makes self-deactivation/demotion impossible, since
  // the only manageable rows are plain ADMINs.
  if (target.role === "SUPER_ADMIN") {
    throw new AdminAccountError(
      "protected_target",
      "The Super Admin account cannot be modified"
    );
  }
  return target;
}

export async function updateAdmin(
  db: PrismaClient,
  actorId: string,
  targetId: string,
  input: { name: string; permissions: string[] }
) {
  const target = await requireEditableTarget(db, targetId);
  const name = validateName(input.name);
  const permissions = sanitizePermissions(input.permissions);

  const updated = await db.admin.update({
    where: { id: targetId },
    data: { name, permissions },
    select: adminSelect,
  });
  await writeAuditLog(db, actorId, targetId, "admin.updated", {
    name: { before: target.name, after: name },
    permissions: { before: target.permissions, after: permissions },
  });
  return updated;
}

// Deactivation is the only removal path: the row stays for history/audit
// while every live session is destroyed so access ends immediately.
export async function setAdminActive(
  db: PrismaClient,
  actorId: string,
  targetId: string,
  active: boolean
) {
  const target = await requireEditableTarget(db, targetId);
  if (target.id === actorId) {
    throw new AdminAccountError(
      "protected_target",
      "You cannot change your own active status"
    );
  }
  if (target.isActive === active) return target;

  const updated = await db.admin.update({
    where: { id: targetId },
    data: { isActive: active, deactivatedAt: active ? null : new Date() },
    select: adminSelect,
  });
  if (!active) await revokeAllSessions(db, targetId);
  await writeAuditLog(
    db,
    actorId,
    targetId,
    active ? "admin.reactivated" : "admin.deactivated",
    { email: target.email }
  );
  return updated;
}

// Super-admin password reset: assigns a new temporary password, flags the
// account for forced change and kills every existing session.
export async function resetAdminPassword(
  db: PrismaClient,
  actorId: string,
  targetId: string,
  newPassword: string
) {
  const target = await requireEditableTarget(db, targetId);
  validatePassword(newPassword);
  const passwordHash = await hashPassword(newPassword);

  const updated = await db.admin.update({
    where: { id: targetId },
    data: { passwordHash, mustChangePassword: true },
    select: adminSelect,
  });
  await revokeAllSessions(db, targetId);
  await writeAuditLog(db, actorId, targetId, "admin.password_reset", {
    email: target.email,
  });
  return updated;
}

// Self-service password change (forced first-login flow). The caller proves
// the current password; all other sessions are revoked so a stolen temporary
// credential can't persist elsewhere.
export async function changeOwnPassword(
  db: PrismaClient,
  adminId: string,
  currentToken: string,
  currentPassword: string,
  newPassword: string
) {
  const admin = await db.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) {
    throw new AdminAccountError("not_found", "Admin not found");
  }
  const ok = await verifyPassword(admin.passwordHash, currentPassword);
  if (!ok) {
    throw new AdminAccountError(
      "wrong_password",
      "Current password is incorrect"
    );
  }
  validatePassword(newPassword);
  const passwordHash = await hashPassword(newPassword);

  await db.admin.update({
    where: { id: adminId },
    data: { passwordHash, mustChangePassword: false },
  });
  await revokeOtherSessions(db, adminId, currentToken);
}
