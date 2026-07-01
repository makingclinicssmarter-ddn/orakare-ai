DO $$ BEGIN
  ALTER TYPE "InvoiceKind" ADD VALUE IF NOT EXISTS 'OTC_SALE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
