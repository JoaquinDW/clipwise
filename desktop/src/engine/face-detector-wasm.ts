/**
 * Face detection on tfjs's WASM backend.
 *
 * The web worker uses tfjs-node, whose native libtensorflow does not package
 * into Electron cleanly (it is neither N-API stable across Electron versions nor
 * published for every mac arch). WASM runs everywhere Electron does, and on the
 * 480px frames face tracking samples it costs tens of milliseconds a frame.
 */
import path from 'path';
import type { FaceDetector } from '@/lib/video/face-track';

export async function createWasmFaceDetector(): Promise<FaceDetector> {
  const tf = await import('@tensorflow/tfjs');
  await import('@tensorflow/tfjs-backend-wasm');
  // The node-wasm build expects tfjs to be provided, not bundled
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api');
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');

  await tf.setBackend('wasm');
  await tf.ready();

  const modelDir = path.join(path.dirname(require.resolve('@vladmandic/face-api/package.json')), 'model');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`));
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  console.log('[face-track] WASM detector ready');

  return async (jpeg) => {
    const image = await loadImage(jpeg);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, image.width, image.height);

    const tensor = tf.tidy(() =>
      tf
        .tensor3d(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), [image.height, image.width, 4], 'int32')
        .slice([0, 0, 0], [-1, -1, 3])
    );
    try {
      const input = tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0];
      const detections = await faceapi.detectAllFaces(input, options);
      return detections.map((d) => ({
        centerX: d.box.x + d.box.width / 2,
        width: d.box.width,
        score: d.score,
      }));
    } finally {
      tensor.dispose();
    }
  };
}
