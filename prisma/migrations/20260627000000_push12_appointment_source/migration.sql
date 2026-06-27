-- Push #12 — Appointment source tracking + sync metadata

DO $$ BEGIN
  CREATE TYPE "AppointmentSource" AS ENUM ('ORAKARE', 'WEBSITE', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "source" "AppointmentSource" NOT NULL DEFAULT 'EXTERNAL';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_calendarEventId_idx" ON "Appointment"("calendarEventId");
