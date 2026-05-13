-- CreateTable
CREATE TABLE "icd10" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupCode" TEXT,

    CONSTRAINT "icd10_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "icd10_code_key" ON "icd10"("code");

-- CreateIndex
CREATE INDEX "icd10_code_idx" ON "icd10"("code");

-- CreateIndex
CREATE INDEX "icd10_name_idx" ON "icd10"("name");
