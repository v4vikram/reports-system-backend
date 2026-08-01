-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_tables" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hiddenColumns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "screenshots" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_rows" (
    "id" TEXT NOT NULL,
    "coverageTableId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL DEFAULT 0,
    "headline" TEXT,
    "publication" TEXT,
    "edition" TEXT,
    "pageNo" TEXT,
    "date" TIMESTAMP(3),
    "link" TEXT,
    "image" TEXT,
    "isTopCoverage" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sections_reportId_idx" ON "sections"("reportId");

-- CreateIndex
CREATE INDEX "coverage_tables_sectionId_idx" ON "coverage_tables"("sectionId");

-- CreateIndex
CREATE INDEX "coverage_rows_coverageTableId_idx" ON "coverage_rows"("coverageTableId");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_tables" ADD CONSTRAINT "coverage_tables_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_rows" ADD CONSTRAINT "coverage_rows_coverageTableId_fkey" FOREIGN KEY ("coverageTableId") REFERENCES "coverage_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

