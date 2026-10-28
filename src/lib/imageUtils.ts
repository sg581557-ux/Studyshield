// ============================================================
// Image handling for the Echo "Solve from Image" feature.
//
// Security: uploaded images are NEVER persisted to the database
// or any server. They live only in the in-memory session store
// (per browser tab) and are sent to the vision model as
// ephemeral data URLs. Chat history persists a small text
// marker (`[IMAGE:id]`); on reload the marker renders as a
// "Uploaded Image" chip without the bytes.
// ============================================================

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];
export const EXTENSION_FALLBACK_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const SESSION_LIMIT = 40; // max images kept in memory per tab session

export interface SessionImage {
  dataUrl: string;
  alt?: string;
}

// ------------------------------------------------------------------
// Marker format used inside persisted message content:
//   [IMAGE:im_<random>]
// The bytes are resolved from the session store while the tab is
// alive; otherwise the marker renders as a "Uploaded Image" chip.
// ------------------------------------------------------------------
export const IMAGE_MARKER_PATTERN = /\[IMAGE:([A-Za-z0-9_-]+)\]/g;

export function newImageId(): string {
  return `im_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function imageMarkersIn(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(IMAGE_MARKER_PATTERN)) ids.push(match[1]);
  return ids;
}

/** Removes every image marker, returning clean text. */
export function stripImageMarkers(content: string): string {
  return content.replace(IMAGE_MARKER_PATTERN, "").trim();
}

/** Replaces every image marker with a human-readable placeholder. */
export function placeholderImageMarkers(content: string): string {
  return content.replace(IMAGE_MARKER_PATTERN, " [Uploaded image] ").replace(/\s{2,}/g, " ").trim();
}

export interface ContentSegment {
  type: "text" | "image";
  text?: string;
  id?: string;
}

/** Splits message content into text and image-marker segments for rendering. */
export function splitImageMarkers(content: string): ContentSegment[] {
  const out: ContentSegment[] = [];
  let last = 0;
  for (const match of content.matchAll(IMAGE_MARKER_PATTERN)) {
    const text = content.slice(last, match.index);
    if (text.trim()) out.push({ type: "text", text });
    out.push({ type: "image", id: match[1] });
    last = match.index + match[0].length;
  }
  const tail = content.slice(last);
  if (tail.trim()) out.push({ type: "text", text: tail });
  return out;
}

// ------------------------------------------------------------------
// Session store — module-level so images survive page switches inside
// the SPA (but never any server round-trip or page reload).
// ------------------------------------------------------------------
const sessionImages = new Map<string, SessionImage>();

export function storeSessionImage(id: string, dataUrl: string, alt?: string): void {
  while (sessionImages.size >= SESSION_LIMIT) {
    const oldest = sessionImages.keys().next().value;
    if (oldest === undefined) break;
    sessionImages.delete(oldest);
  }
  sessionImages.set(id, { dataUrl, alt });
}

export function getSessionImage(id: string): SessionImage | undefined {
  return sessionImages.get(id);
}

/** Called when the mentor page unmounts — drop all bytes. */
export function clearSessionImages(): void {
  sessionImages.clear();
}

// ------------------------------------------------------------------
// Validation + compression
// ------------------------------------------------------------------

function inferTypeFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_FALLBACK_TYPES[ext] ?? null;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (file.size === 0) return "That file is empty. Please pick another image.";
  let type = file.type;
  // iOS camera fallback can yield "" or heic/heif — infer from extension
  if (!type || !ALLOWED_IMAGE_TYPES.includes(type)) {
    const inferred = file.name ? inferTypeFromName(file.name) : null;
    if (inferred && ALLOWED_IMAGE_TYPES.includes(inferred)) type = inferred;
    else if (!ALLOWED_IMAGE_TYPES.includes(type)) {
      // Still allow heic/heif for conversion; otherwise reject
      if (type === "" && inferred) {
        // allow via inferred
      } else if (!type && inferred) {
        // allow
      } else {
        return "Unsupported format. Please upload a JPG, PNG, WEBP, HEIC or AVIF image.";
      }
    }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is larger than 10 MB. Please compress it and try again.";
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

/**
 * Reads a File/Blob into a data URL without touching the disk.
 * Uses FileReader for maximum browser support.
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales and re-encodes an image to a compact WebP data URL so the
 * vision request stays small and fast. Falls back to JPEG when WebP
 * encoding is unavailable.
 */
export async function compressImage(src: string, maxDim = 1600, quality = 0.82): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#ffffff"; // JPEG fallback background
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  try {
    return canvas.toDataURL("image/webp", quality);
  } catch {
    return canvas.toDataURL("image/jpeg", quality);
  }
}

/**
 * Crops (and optionally rotates) an image using pixel coordinates
 * produced by react-easy-crop's `onCropComplete`.
 */
export async function cropImage(
  src: string,
  pixels: { x: number; y: number; width: number; height: number },
  rotation = 0,
  quality = 0.92,
): Promise<string> {
  const img = await loadImage(src);
  const bw = img.naturalWidth;
  const bh = img.naturalHeight;
  const rad = (rotation * Math.PI) / 180;

  let source: HTMLCanvasElement | HTMLImageElement = img;
  if (rotation % 360 !== 0) {
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rw = Math.max(1, Math.floor(bw * cos + bh * sin));
    const rh = Math.max(1, Math.floor(bw * sin + bh * cos));
    const rotated = document.createElement("canvas");
    rotated.width = rw;
    rotated.height = rh;
    const rctx = rotated.getContext("2d");
    if (!rctx) return src;
    rctx.translate(rw / 2, rh / 2);
    rctx.rotate(rad);
    rctx.translate(-bw / 2, -bh / 2);
    rctx.drawImage(img, 0, 0);
    source = rotated;
  }

  const cw = Math.max(1, Math.round(pixels.width));
  const ch = Math.max(1, Math.round(pixels.height));
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, cw, ch);

  try {
    return out.toDataURL("image/webp", quality);
  } catch {
    return out.toDataURL("image/jpeg", quality);
  }
}
