-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "gstNo" TEXT,
ADD COLUMN     "invoicePrefix" TEXT DEFAULT 'OKR',
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "regNo" TEXT;
