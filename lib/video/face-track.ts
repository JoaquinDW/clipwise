/**
 * Face tracking for vertical crops
 *
 * Produces the horizontal path the 9:16 crop window should follow so the person
 * speaking stays in frame. Frames are sampled cheaply, faces are detected on the
 * samples, and the resulting trajectory is smoothed and written out as an ffmpeg
 * `sendcmd` script that drives the `crop` filter's `x` at render time.
 *
 * Why sendcmd and not an expression: crop's `x` accepts a per-frame expression,
 * but a 60s clip needs hundreds of waypoints and the expression becomes an
 * unwieldy `if()` chain. sendcmd keeps the trajectory as data.
 */

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/** Frames sampled per second for detection. Detection cost scales with this. */
const SAMPLE_FPS = 4;

/** Frames are downscaled to this width before detection — plenty for faces. */
const SAMPLE_WIDTH = 480;

/** Waypoints written per second. Denser than sampling for smoother motion. */
const COMMAND_HZ = 10;

/** A jump larger than this fraction of frame width reads as a camera cut. */
const CUT_THRESHOLD = 0.25;

export interface TrackingProfile {
  /** 0..1 — higher follows the subject faster. */
  responsiveness: number;
  /** Subject drift under this fraction of the crop width is ignored (tripod effect). */
  deadZone: number;
  /**
   * Hard cap on how far off-centre the subject may get, as a fraction of the
   * crop width. Easing alone lags behind sustained movement by an amount
   * proportional to the subject's speed, which walks them out of frame; this
   * bound is what actually keeps them in it.
   */
  maxOffset: number;
}

export const TRACKING_PROFILES: Record<'speaker' | 'action', TrackingProfile> = {
  // A talking head barely moves; chasing small motion looks like a handheld wobble
  speaker: { responsiveness: 0.1, deadZone: 0.06, maxOffset: 0.22 },
  // Demonstrations move across frame and need the camera to keep up
  action: { responsiveness: 0.25, deadZone: 0.02, maxOffset: 0.15 },
};

export type TrajectoryResult =
  | { kind: 'dynamic'; cmdFilePath: string; startX: number; detectionRate: number }
  | { kind: 'static'; reason: string };

type Tf = typeof import('@tensorflow/tfjs-node');
type FaceApi = typeof import('@vladmandic/face-api');

/** Lazily loaded so the worker only pays the model cost when tracking is used. */
let detectorReady: Promise<{ tf: Tf; faceapi: FaceApi }> | null = null;

async function loadDetector() {
  if (!detectorReady) {
    detectorReady = (async () => {
      // tfjs-node registers the native backend as a side effect of being imported
      const tf = await import('@tensorflow/tfjs-node');
      const faceapi = await import('@vladmandic/face-api');
      await tf.setBackend('tensorflow');
      await tf.ready();

      // Weights ship inside the package — nothing is fetched at runtime.
      // SSD MobileNet rather than TinyFaceDetector: measured on sampled frames,
      // tiny found the face in 13% of them against SSD's 100%, for 32ms vs 11ms
      // per frame. A missed frame means the camera holds still while the subject
      // walks out of the crop, so reliability wins over the 20ms.
      const pkgDir = path.dirname(require.resolve('@vladmandic/face-api/package.json'));
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(pkgDir, 'model'));
      console.log('[face-track] Detector ready');
      return { tf, faceapi };
    })().catch((err) => {
      // Don't cache a failed load — the next clip gets a fresh attempt
      detectorReady = null;
      throw err;
    });
  }
  return detectorReady;
}

interface Detection {
  centerX: number; // in sampled-frame coordinates
  width: number;
  score: number;
}

/**
 * Pick the subject to follow.
 *
 * The largest face wins, except that we prefer whoever we were already
 * following: without this an interview flips between speakers every time the
 * other person leans forward.
 */
function pickSubject(faces: Detection[], previousX: number | null): Detection | null {
  if (faces.length === 0) return null;
  if (faces.length === 1 || previousX === null) {
    return faces.reduce((a, b) => (b.width > a.width ? b : a));
  }

  const largest = faces.reduce((a, b) => (b.width > a.width ? b : a));
  const nearest = faces.reduce((a, b) =>
    Math.abs(b.centerX - previousX) < Math.abs(a.centerX - previousX) ? b : a
  );

  // Switch away from the subject we were following only for a clearly bigger
  // face — someone stepping into the foreground, not a lean
  if (largest !== nearest && largest.width > nearest.width * 1.4) return largest;
  return nearest;
}

/**
 * Sample frames and detect the subject's horizontal position in each.
 * Returns one entry per sampled frame; null where no face was found.
 */
async function detectSubjectPath(
  inputPath: string,
  workDir: string
): Promise<{ path: (number | null)[]; sampleWidth: number }> {
  await fs.mkdir(workDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(`fps=${SAMPLE_FPS},scale=${SAMPLE_WIDTH}:-2`)
      .outputOptions(['-q:v', '4'])
      .output(path.join(workDir, 'f-%05d.jpg'))
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Frame sampling failed: ${err.message}`)))
      .run();
  });

  const frames = (await fs.readdir(workDir)).filter((f) => f.endsWith('.jpg')).sort();
  if (frames.length === 0) throw new Error('Frame sampling produced no frames');

  const { tf, faceapi } = await loadDetector();
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

  const subjectPath: (number | null)[] = [];
  let previousX: number | null = null;

  for (const frame of frames) {
    const buffer = await fs.readFile(path.join(workDir, frame));
    const tensor = tf.node.decodeImage(buffer, 3);
    try {
      // face-api bundles its own copy of tfjs-core, so its Tensor type is
      // structurally identical to tfjs-node's but nominally distinct
      const input = tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0];
      const detections = await faceapi.detectAllFaces(input, options);
      const faces: Detection[] = detections.map((d) => ({
        centerX: d.box.x + d.box.width / 2,
        width: d.box.width,
        score: d.score,
      }));
      const subject = pickSubject(faces, previousX);
      if (subject) previousX = subject.centerX;
      subjectPath.push(subject ? subject.centerX : null);
    } finally {
      tf.dispose(tensor);
    }
  }

  return { path: subjectPath, sampleWidth: SAMPLE_WIDTH };
}

/**
 * Smooth the raw per-frame positions into something a camera operator could
 * have shot: hold through gaps, snap on cuts, ease everywhere else.
 */
function smoothPath(
  raw: (number | null)[],
  frameWidth: number,
  cropWidth: number,
  profile: TrackingProfile
): number[] {
  const deadZonePx = cropWidth * profile.deadZone;
  const maxOffsetPx = cropWidth * profile.maxOffset;
  const cutThresholdPx = frameWidth * CUT_THRESHOLD;

  // Seed from the first detection so the clip doesn't open mid-pan
  const firstDetection = raw.find((v) => v !== null);
  let current = firstDetection ?? frameWidth / 2;
  let lastTarget = current;

  return raw.map((value) => {
    // No face this frame: hold position rather than drift to center
    const target = value ?? lastTarget;

    if (Math.abs(target - lastTarget) > cutThresholdPx) {
      // Camera cut — panning across it would look like a whip pan
      current = target;
    } else {
      if (Math.abs(target - current) > deadZonePx) {
        current += (target - current) * profile.responsiveness;
      }
      // Easing lags behind steady movement; drag the camera along rather than
      // let the subject slide towards the edge of the frame
      const offset = target - current;
      if (Math.abs(offset) > maxOffsetPx) {
        current = target - Math.sign(offset) * maxOffsetPx;
      }
    }

    lastTarget = target;
    return current;
  });
}

/**
 * Build the crop trajectory for a clip.
 *
 * @param inputPath   video to analyse
 * @param sourceWidth full-resolution width of that video
 * @param cropWidth   width of the 9:16 window that will be cropped out
 */
export async function buildFaceTrajectory(
  inputPath: string,
  sourceWidth: number,
  cropWidth: number,
  profile: TrackingProfile
): Promise<TrajectoryResult> {
  const workDir = path.join(os.tmpdir(), `facetrack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  try {
    const { path: rawPath, sampleWidth } = await detectSubjectPath(inputPath, workDir);

    const detected = rawPath.filter((v) => v !== null).length;
    const detectionRate = detected / rawPath.length;

    // Nothing to follow — a screen recording mislabelled as a talking head, or
    // footage the detector can't read. A static crop is the honest answer.
    if (detected === 0) {
      return { kind: 'static', reason: 'no faces detected' };
    }

    // Sampled coordinates -> source coordinates -> crop window left edge
    const scale = sourceWidth / sampleWidth;
    const smoothed = smoothPath(rawPath, sampleWidth, cropWidth / scale, profile);
    const maxX = Math.max(0, sourceWidth - cropWidth);
    const toCropX = (centerX: number) =>
      Math.round(Math.min(maxX, Math.max(0, centerX * scale - cropWidth / 2)));

    // Resample to the command rate, interpolating between sampled frames so the
    // motion between waypoints stays continuous
    const durationSeconds = smoothed.length / SAMPLE_FPS;
    const commandCount = Math.max(1, Math.ceil(durationSeconds * COMMAND_HZ));
    const lines: string[] = [];
    let startX = 0;

    for (let i = 0; i < commandCount; i++) {
      const t = i / COMMAND_HZ;
      const position = t * SAMPLE_FPS;
      const lower = Math.min(smoothed.length - 1, Math.floor(position));
      const upper = Math.min(smoothed.length - 1, lower + 1);
      const fraction = position - lower;
      const centerX = smoothed[lower] + (smoothed[upper] - smoothed[lower]) * fraction;

      const x = toCropX(centerX);
      if (i === 0) startX = x;
      lines.push(`${t.toFixed(3)} crop@dyn x ${x};`);
    }

    const cmdFilePath = path.join(os.tmpdir(), `facetrack-${Date.now()}.cmd`);
    await fs.writeFile(cmdFilePath, lines.join('\n'), 'utf-8');

    console.log(
      `[face-track] ${rawPath.length} frames, ${(detectionRate * 100).toFixed(0)}% with a face, ` +
        `${lines.length} waypoints`
    );

    return { kind: 'dynamic', cmdFilePath, startX, detectionRate };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
