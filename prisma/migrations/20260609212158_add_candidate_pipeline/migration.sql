-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VideoStatus" ADD VALUE 'SCORING';
ALTER TYPE "VideoStatus" ADD VALUE 'RANKING';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "analysisMetrics" JSONB;

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "expandedStart" DOUBLE PRECISION NOT NULL,
    "expandedEnd" DOUBLE PRECISION NOT NULL,
    "transcript" TEXT NOT NULL,
    "heuristicScore" DOUBLE PRECISION NOT NULL,
    "gptScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidate_videoId_heuristicScore_idx" ON "Candidate"("videoId", "heuristicScore");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
