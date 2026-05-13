/*
  Warnings:

  - Changed the type of `form` on the `prescription_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PatientCategory" AS ENUM ('child', 'adult', 'elderly');

-- CreateEnum
CREATE TYPE "InteractionSeverity" AS ENUM ('warning', 'contraindicated');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT;

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "atxCode" TEXT,
ADD COLUMN     "drugId" TEXT,
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "routeOfAdmin" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "form" TYPE TEXT USING "form"::TEXT;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "diagnosisCode" TEXT,
ADD COLUMN     "diagnosisName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientCategory" "PatientCategory",
ADD COLUMN     "patientWeight" DOUBLE PRECISION;

-- DropEnum
DROP TYPE "MedicationForm";

-- CreateTable
CREATE TABLE "drugs" (
                         "id" TEXT NOT NULL,
                         "mnn" TEXT NOT NULL,
                         "tradeName" TEXT,
                         "atxCode" TEXT NOT NULL,
                         "atxName" TEXT,
                         "form" TEXT NOT NULL,
                         "routeOfAdmin" TEXT NOT NULL,
                         "dosages" TEXT,
                         "isPrescription" BOOLEAN NOT NULL DEFAULT true,
                         "isLgota" BOOLEAN NOT NULL DEFAULT false,
                         "minAge" INTEGER,
                         "maxAge" INTEGER,
                         "category" TEXT,
                         "warnings" TEXT,
                         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_drug_links" (
                                        "id" TEXT NOT NULL,
                                        "diagnosisCode" TEXT NOT NULL,
                                        "diagnosisName" TEXT NOT NULL,
                                        "drugId" TEXT NOT NULL,

                                        CONSTRAINT "diagnosis_drug_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_interactions" (
                                     "id" TEXT NOT NULL,
                                     "drugAId" TEXT NOT NULL,
                                     "drugBId" TEXT NOT NULL,
                                     "severity" "InteractionSeverity" NOT NULL,
                                     "description" TEXT NOT NULL,

                                     CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drugs_mnn_idx" ON "drugs"("mnn");

-- CreateIndex
CREATE INDEX "drugs_atxCode_idx" ON "drugs"("atxCode");

-- CreateIndex
CREATE INDEX "drugs_category_idx" ON "drugs"("category");

-- CreateIndex
CREATE INDEX "diagnosis_drug_links_diagnosisCode_idx" ON "diagnosis_drug_links"("diagnosisCode");

-- CreateIndex
CREATE UNIQUE INDEX "drug_interactions_drugAId_drugBId_key" ON "drug_interactions"("drugAId", "drugBId");

-- AddForeignKey
ALTER TABLE "diagnosis_drug_links" ADD CONSTRAINT "diagnosis_drug_links_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugAId_fkey" FOREIGN KEY ("drugAId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugBId_fkey" FOREIGN KEY ("drugBId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;