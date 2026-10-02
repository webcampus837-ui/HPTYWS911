export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

export interface PreparedImage {
  blob: Blob;
  /** File extension without the dot, matching the produced blob type. */
  extension: string;
  contentType: string;
  previewUrl: string;
}

/** Returns a friendly error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  const type = file.type.toLowerCase();
  const looksLikeImage =
    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!looksLikeImage) {
    return `"${file.name}" is not a supported image. Use JPG, PNG or WEBP.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is larger than 8 MB. Please choose a smaller image.`;
  }
  if (file.size === 0) return `"${file.name}" looks empty. Please choose another image.`;
  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; release: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        release: () => bitmap.close(),
      };
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Downscale + convert an image to WEBP before upload (keeps storage small
 * and pages fast). Falls back to the original file when anything fails.
 */
export async function prepareImageForUpload(file: File, maxDimension = 1600, quality = 0.85): Promise<PreparedImage> {
  const original: PreparedImage = {
    blob: file,
    extension: extensionFor(file.type, file.name),
    contentType: file.type || 'image/jpeg',
    previewUrl: URL.createObjectURL(file),
  };
  if (typeof document === 'undefined') return original;

  let bitmap: Awaited<ReturnType<typeof loadBitmap>> | null = null;
  try {
    bitmap = await loadBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.imageSmoothingQuality = 'high';
    bitmap.draw(ctx, targetW, targetH);

    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (blob && blob.type === 'image/webp') {
      if (blob.size < file.size || file.type !== 'image/webp' || scale < 1) {
        URL.revokeObjectURL(original.previewUrl);
        return { blob, extension: 'webp', contentType: 'image/webp', previewUrl: URL.createObjectURL(blob) };
      }
    }
    // WEBP not supported by this browser → try PNG, else keep original
    blob = await canvasToBlob(canvas, 'image/png', quality);
    if (blob && blob.size < file.size) {
      URL.revokeObjectURL(original.previewUrl);
      return { blob, extension: 'png', contentType: 'image/png', previewUrl: URL.createObjectURL(blob) };
    }
    return original;
  } catch {
    return original;
  } finally {
    bitmap?.release();
  }
}

function extensionFor(type: string, name: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/jpeg') return 'jpg';
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return (match?.[1] ?? 'jpg').toLowerCase();
}
