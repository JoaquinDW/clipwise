// The shared face-track module imports tfjs-node for the cloud worker. The
// desktop app never loads it (it swaps in the WASM detector), so it is not a
// dependency here; this declaration only lets the shared code type-check.
declare module '@tensorflow/tfjs-node' {
  export * from '@tensorflow/tfjs';
  export const node: {
    decodeImage(contents: Uint8Array, channels?: number): import('@tensorflow/tfjs').Tensor3D;
  };
}
