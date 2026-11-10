-- Enforce at the database level that at most one SUPER_ADMIN row can exist.
-- A partial unique index makes concurrent provisioning attempts fail
-- atomically instead of relying on application-layer locking.
CREATE UNIQUE INDEX "admins_single_super_admin" ON "admins" ("role") WHERE "role" = 'SUPER_ADMIN';
