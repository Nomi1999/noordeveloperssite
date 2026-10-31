/**
 * Hero frame decoder (Web Worker). Decodes a compressed frame already cropped and
 * scaled to the canvas, on this worker's thread, and transfers the ImageBitmap back,
 * so the page's main thread only copies finished pixels.
 */
interface DecodeRequest {
  id: number;
  blob: Blob;
  /** sx, sy, sw, sh of the cover-fit crop in frame pixels */
  crop: [number, number, number, number];
  /** canvas width and height */
  size: [number, number];
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<DecodeRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

scope.onmessage = async ({ data: { id, blob, crop, size } }) => {
  try {
    const bmp = await createImageBitmap(blob, crop[0], crop[1], crop[2], crop[3], {
      resizeWidth: size[0],
      resizeHeight: size[1],
      resizeQuality: "high",
    });
    scope.postMessage({ id, bmp }, [bmp]);
  } catch (error) {
    scope.postMessage({ id, error: String(error) });
  }
};
