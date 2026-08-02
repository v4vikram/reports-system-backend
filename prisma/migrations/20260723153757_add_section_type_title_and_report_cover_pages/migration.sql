-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('standard', 'custom');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "coverPages" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "content" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "type" "SectionType" NOT NULL DEFAULT 'standard';

