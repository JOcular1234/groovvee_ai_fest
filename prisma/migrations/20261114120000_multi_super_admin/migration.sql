-- Multiple SUPER_ADMIN accounts are now supported (super admins can create
-- and promote others). The app guards the last active one from demotion.
DROP INDEX "admins_single_super_admin";
