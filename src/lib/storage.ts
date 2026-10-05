import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { AppError } from "./errors";

export interface StoredFile {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateImageMagicBytes(buffer: Buffer): {
  valid: boolean;
  detectedMime?: string;
  ext?: string;
} {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg", ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png", ext: ".png" };
  }

  // WEBP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: "image/webp", ext: ".webp" };
  }

  return { valid: false };
}

export interface StorageProvider {
  saveFile(buffer: Buffer, originalName?: string, declaredMime?: string): Promise<StoredFile>;
  getFile(filename: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
}

class HardenedLocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    // Store outside of public web root to avoid direct arbitrary execution
    this.uploadDir = path.join(process.cwd(), "storage", "uploads");
  }

  async ensureDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {}
  }

  async saveFile(
    buffer: Buffer,
    _originalName?: string,
    declaredMime?: string
  ): Promise<StoredFile> {
    // 1. File size enforcement
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw AppError.badRequest(
        `File size exceeds maximum allowed limit of 5MB (${(buffer.length / 1024 / 1024).toFixed(2)}MB uploaded).`
      );
    }

    // 2. MIME whitelist check
    if (declaredMime && !ALLOWED_MIME_TYPES.has(declaredMime.toLowerCase())) {
      throw AppError.badRequest(
        `Invalid file type: ${declaredMime}. Only JPEG, PNG, and WebP images are permitted.`
      );
    }

    // 3. Cryptographic Magic Bytes verification
    const magic = validateImageMagicBytes(buffer);
    if (!magic.valid || !magic.detectedMime || !magic.ext) {
      throw AppError.badRequest(
        "File signature verification failed: Corrupt or spoofed image binary detected."
      );
    }

    await this.ensureDir();

    // 4. Generate random UUID filename - NEVER trust user supplied filename on disk
    const safeFilename = `${crypto.randomUUID()}${magic.ext}`;
    const filePath = path.join(this.uploadDir, safeFilename);

    await fs.writeFile(filePath, buffer);

    return {
      url: `/api/files/${safeFilename}`,
      filename: safeFilename,
      mimeType: magic.detectedMime,
      sizeBytes: buffer.length,
    };
  }

  async getFile(filename: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    // Prevent Directory Traversal Attacks: strictly extract basename
    const cleanBasename = path.basename(filename);
    const filePath = path.join(this.uploadDir, cleanBasename);

    // Verify resolved path stays strictly inside upload directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      throw AppError.forbidden("Access denied: Invalid file path.");
    }

    try {
      const buffer = await fs.readFile(filePath);
      const magic = validateImageMagicBytes(buffer);
      const mimeType = magic.detectedMime || "application/octet-stream";
      return { buffer, mimeType };
    } catch {
      // Fallback check in public/uploads for legacy assets
      try {
        const publicFallback = path.join(process.cwd(), "public", "uploads", cleanBasename);
        const buffer = await fs.readFile(publicFallback);
        const magic = validateImageMagicBytes(buffer);
        return { buffer, mimeType: magic.detectedMime || "image/jpeg" };
      } catch {
        return null;
      }
    }
  }
}

export const storageProvider: StorageProvider = new HardenedLocalStorageProvider();
