import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import {
  hashPassword,
  normalizeEmail,
  passwordIssues,
  verifyPassword,
} from "@/lib/auth/password";
import { clearTwoFactor } from "@/lib/auth/mfa";
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
      | "invalid_role"
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
  totpEnabledAt: true,
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

export async function writeAuditLog(
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

function validateRole(raw: string): "ADMIN" | "SUPER_ADMIN" {
  if (raw === "ADMIN" || raw === "SUPER_ADMIN") return raw;
  throw new AdminAccountError("invalid_role", "Unknown role");
}

// Only SUPER_ADMIN rows may call this. A SUPER_ADMIN can be created
// directly — section grants are stored but ignored while the role lasts
// (they take effect if the account is later demoted).
export async function createAdmin(
  db: PrismaClient,
  actorId: string,
  input: {
    name: string;
    email: string;
    password: string;
    role: string;
    permissions: string[];
  }
) {
  const name = validateName(input.name);
  const email = validateEmail(input.email);
  validatePassword(input.password);
  const role = validateRole(input.role);
  const permissions = sanitizePermissions(input.permissions);
  const passwordHash = await hashPassword(input.password);

  try {
    const admin = await db.admin.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        permissions,
        mustChangePassword: true,
        isActive: true,
      },
      select: adminSelect,
    });
    await writeAuditLog(db, actorId, admin.id, "admin.created", {
      email,
      role,
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
  // SUPER_ADMIN rows can't be edited, deactivated, password- or 2FA-reset
  // through management actions — deliberate friction: demote first, which
  // itself is guarded against removing the last super admin.
  if (target.role === "SUPER_ADMIN") {
    throw new AdminAccountError(
      "protected_target",
      "Demote this account to Admin before modifying it"
    );
  }
  return target;
}

// Promote/demote between ADMIN and SUPER_ADMIN. Guardrails: you can never
// change your own role, and demotion is refused when it would remove the
// last active SUPER_ADMIN — the site must always keep a way back in.
export async function setAdminRole(
  db: PrismaClient,
  actorId: string,
  targetId: string,
  role: string
) {
  const next = validateRole(role);
  if (targetId === actorId) {
    throw new AdminAccountError(
      "protected_target",
      "You cannot change your own role"
    );
  }
  return db.$transaction(async (tx) => {
    const target = await tx.admin.findUnique({ where: { id: targetId } });
    if (!target) throw new AdminAccountError("not_found", "Admin not found");
    if (target.role === next) return target;
    if (target.role === "SUPER_ADMIN" && next === "ADMIN") {
      const others = await tx.admin.count({
        where: { role: "SUPER_ADMIN", isActive: true, id: { not: targetId } },
      });
      if (others === 0) {
        throw new AdminAccountError(
          "protected_target",
          "This is the last active Super Admin — promote another admin first"
        );
      }
    }
    const updated = await tx.admin.update({
      where: { id: targetId },
      data: { role: next },
      select: adminSelect,
    });
    await tx.adminAuditLog.create({
      data: {
        actorId,
        targetId,
        action: "admin.role_changed",
        details: { role: { before: target.role, after: next } },
      },
    });
    return updated;
  });
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

// Permanent removal — for accounts created by mistake or fully offboarded
// people. Sessions cascade-delete; audit logs and reviewer fields SetNull
// so history survives. An audit entry is written before the row goes, with
// the identity captured in details since targetId will be nulled.
export async function deleteAdmin(
  db: PrismaClient,
  actorId: string,
  targetId: string
) {
  const target = await requireEditableTarget(db, targetId);
  if (target.id === actorId) {
    throw new AdminAccountError(
      "protected_target",
      "You cannot delete your own account"
    );
  }
  // DiscoveryRun.adminId is onDelete: Restrict — the only relation that
  // blocks removal. Deactivation is the right path for those accounts.
  const runs = await db.discoveryRun.count({ where: { adminId: targetId } });
  if (runs > 0) {
    throw new AdminAccountError(
      "protected_target",
      "This admin has discovery runs and can't be deleted — deactivate them instead"
    );
  }
  try {
    await db.$transaction(async (tx) => {
      await tx.adminAuditLog.create({
        data: {
          actorId,
          targetId,
          action: "admin.deleted",
          details: { email: target.email, name: target.name, role: target.role },
        },
      });
      await tx.admin.delete({ where: { id: targetId } });
    });
  } catch (err) {
    // Any other Restrict relation that appears later lands here.
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: unknown }).code === "P2014"
    ) {
      throw new AdminAccountError(
        "protected_target",
        "This admin is referenced by other records — deactivate them instead"
      );
    }
    throw err;
  }
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

// Super-admin 2FA reset for a plain ADMIN who lost their authenticator and
// recovery codes: clears the factor and signs them out everywhere. They set
// it up again at next sign-in (immediately if policy requires it).
export async function resetAdminTwoFactor(
  db: PrismaClient,
  actorId: string,
  targetId: string
) {
  const target = await requireEditableTarget(db, targetId);
  await clearTwoFactor(db, targetId);
  await revokeAllSessions(db, targetId);
  await writeAuditLog(db, actorId, targetId, "admin.2fa_reset", {
    email: target.email,
  });
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
