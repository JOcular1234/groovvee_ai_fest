-- Contact/demographic fields collected on the public registration form.
ALTER TABLE "event_registrations"
  ADD COLUMN "school" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "country" TEXT;
