/**
 * Browser-only helpers for turning an uploaded image file into a small,
 * avatar-friendly data URL. Uses a canvas to cap dimensions + compress so we
 * don't bloat the database with multi-megabyte images.
 */

const MAX_AVATAR_DIM = 256;
const AVATAR_QUALITY = 0.85;

export function fileToAvatarDataUrl(
  file: File,
  maxDim = MAX_AVATAR_DIM,
  quality = AVATAR_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be loaded."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = file.type === "image/png";
        const out = canvas.toDataURL(
          isPng ? "image/png" : "image/jpeg",
          isPng ? undefined : quality
        );
        resolve(out);
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}
