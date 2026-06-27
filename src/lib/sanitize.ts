const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3,8}$/;

/**
 * Validates that a string is a safe CSS hex color.
 * Returns the color if valid, otherwise returns the fallback.
 */
export function sanitizeHexColor(value: string, fallback: string): string {
  if (HEX_COLOR_RE.test(value)) return value;
  return fallback;
}

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validates a file before upload.
 * Returns null if valid, or an error message string.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, GIF ou WebP.`;
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 5 MB.`;
  }
  return null;
}
