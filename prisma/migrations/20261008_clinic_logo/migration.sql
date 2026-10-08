-- Migration: clinic_logo
-- Add logoUrl column to Clinic for invoice/PDF branding

ALTER TABLE "Clinic" ADD COLUMN "logoUrl" TEXT;
