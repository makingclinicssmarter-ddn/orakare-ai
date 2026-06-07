-- DropForeignKey
ALTER TABLE "Sitting" DROP CONSTRAINT "Sitting_treatmentId_fkey";

-- AddForeignKey
ALTER TABLE "Sitting" ADD CONSTRAINT "Sitting_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "TreatmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
