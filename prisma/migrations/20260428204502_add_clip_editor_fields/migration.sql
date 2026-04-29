-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "originalEnd" DOUBLE PRECISION,
ADD COLUMN     "originalStart" DOUBLE PRECISION,
ADD COLUMN     "parentClipId" TEXT;
