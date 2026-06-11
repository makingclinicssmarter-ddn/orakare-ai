-- Push #2A — performance indexes
-- Every foreign-key column gets indexed. Composite indexes added for hot
-- query patterns (clinic-scoped lists ordered by date or status).
--
-- All CREATE INDEX use IF NOT EXISTS so re-running is safe.
-- We do NOT use CREATE INDEX CONCURRENTLY because Prisma wraps migrations in
-- a transaction and CONCURRENTLY is not allowed in transactions. At current
-- data volumes (~50 patients, ~140 sittings) each CREATE INDEX completes in
-- single-digit milliseconds, so the brief table lock is invisible.

-- Doctor
CREATE INDEX IF NOT EXISTS "Doctor_clinicId_idx" ON "Doctor"("clinicId");

-- Patient
CREATE INDEX IF NOT EXISTS "Patient_clinicId_idx" ON "Patient"("clinicId");
CREATE INDEX IF NOT EXISTS "Patient_clinicId_createdAt_idx" ON "Patient"("clinicId", "createdAt");
CREATE INDEX IF NOT EXISTS "Patient_mobile_idx" ON "Patient"("mobile");

-- Visit
CREATE INDEX IF NOT EXISTS "Visit_clinicId_idx" ON "Visit"("clinicId");
CREATE INDEX IF NOT EXISTS "Visit_patientId_idx" ON "Visit"("patientId");
CREATE INDEX IF NOT EXISTS "Visit_doctorId_idx" ON "Visit"("doctorId");
CREATE INDEX IF NOT EXISTS "Visit_clinicId_status_idx" ON "Visit"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "Visit_clinicId_createdAt_idx" ON "Visit"("clinicId", "createdAt");

-- TreatmentItem
CREATE INDEX IF NOT EXISTS "TreatmentItem_treatmentPlanId_idx" ON "TreatmentItem"("treatmentPlanId");
CREATE INDEX IF NOT EXISTS "TreatmentItem_consentStatus_idx" ON "TreatmentItem"("consentStatus");

-- FollowUp
CREATE INDEX IF NOT EXISTS "FollowUp_patientId_idx" ON "FollowUp"("patientId");
CREATE INDEX IF NOT EXISTS "FollowUp_visitId_idx" ON "FollowUp"("visitId");
CREATE INDEX IF NOT EXISTS "FollowUp_treatmentItemId_idx" ON "FollowUp"("treatmentItemId");
CREATE INDEX IF NOT EXISTS "FollowUp_status_dueDate_idx" ON "FollowUp"("status", "dueDate");

-- Communication
CREATE INDEX IF NOT EXISTS "Communication_visitId_idx" ON "Communication"("visitId");

-- AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Treatment
CREATE INDEX IF NOT EXISTS "Treatment_clinicId_idx" ON "Treatment"("clinicId");
CREATE INDEX IF NOT EXISTS "Treatment_patientId_idx" ON "Treatment"("patientId");
CREATE INDEX IF NOT EXISTS "Treatment_visitId_idx" ON "Treatment"("visitId");
CREATE INDEX IF NOT EXISTS "Treatment_consultantId_idx" ON "Treatment"("consultantId");
CREATE INDEX IF NOT EXISTS "Treatment_clinicId_status_idx" ON "Treatment"("clinicId", "status");

-- Sitting
CREATE INDEX IF NOT EXISTS "Sitting_clinicId_idx" ON "Sitting"("clinicId");
CREATE INDEX IF NOT EXISTS "Sitting_patientId_idx" ON "Sitting"("patientId");
CREATE INDEX IF NOT EXISTS "Sitting_treatmentId_idx" ON "Sitting"("treatmentId");
CREATE INDEX IF NOT EXISTS "Sitting_clinicId_date_idx" ON "Sitting"("clinicId", "date");

-- Invoice
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_idx" ON "Invoice"("clinicId");
CREATE INDEX IF NOT EXISTS "Invoice_patientId_idx" ON "Invoice"("patientId");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_date_idx" ON "Invoice"("clinicId", "date");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_status_idx" ON "Invoice"("clinicId", "status");

-- InvoiceItem
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- Receipt
CREATE INDEX IF NOT EXISTS "Receipt_clinicId_idx" ON "Receipt"("clinicId");
CREATE INDEX IF NOT EXISTS "Receipt_patientId_idx" ON "Receipt"("patientId");
CREATE INDEX IF NOT EXISTS "Receipt_invoiceId_idx" ON "Receipt"("invoiceId");
CREATE INDEX IF NOT EXISTS "Receipt_clinicId_date_idx" ON "Receipt"("clinicId", "date");

-- PaymentAllocation
CREATE INDEX IF NOT EXISTS "PaymentAllocation_receiptId_idx" ON "PaymentAllocation"("receiptId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_treatmentId_idx" ON "PaymentAllocation"("treatmentId");

-- Consultant
CREATE INDEX IF NOT EXISTS "Consultant_clinicId_idx" ON "Consultant"("clinicId");

-- FeeEntry
CREATE INDEX IF NOT EXISTS "FeeEntry_clinicId_idx" ON "FeeEntry"("clinicId");
CREATE INDEX IF NOT EXISTS "FeeEntry_consultantId_idx" ON "FeeEntry"("consultantId");
CREATE INDEX IF NOT EXISTS "FeeEntry_invoiceId_idx" ON "FeeEntry"("invoiceId");
CREATE INDEX IF NOT EXISTS "FeeEntry_treatmentId_idx" ON "FeeEntry"("treatmentId");
CREATE INDEX IF NOT EXISTS "FeeEntry_clinicId_status_idx" ON "FeeEntry"("clinicId", "status");

-- InventoryItem
CREATE INDEX IF NOT EXISTS "InventoryItem_clinicId_idx" ON "InventoryItem"("clinicId");

-- Expense
CREATE INDEX IF NOT EXISTS "Expense_clinicId_idx" ON "Expense"("clinicId");
CREATE INDEX IF NOT EXISTS "Expense_clinicId_date_idx" ON "Expense"("clinicId", "date");

-- Appointment
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_idx" ON "Appointment"("clinicId");
CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_date_idx" ON "Appointment"("clinicId", "date");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_status_idx" ON "Appointment"("clinicId", "status");
