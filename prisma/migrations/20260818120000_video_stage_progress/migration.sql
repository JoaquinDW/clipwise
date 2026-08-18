-- Progress reporting for the video pipeline.
-- "stageProgress" is progress within the current status (0-100), not overall:
-- the stage -> global band mapping lives in lib/video/progress.ts.
ALTER TABLE "Video" ADD COLUMN "stageProgress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "stageDetail" TEXT;

-- Per-clip render progress (0-100) while the clip is GENERATING.
ALTER TABLE "Clip" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
