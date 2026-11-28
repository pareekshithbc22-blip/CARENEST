/**
 * Certificate File Validation and Magic Bytes Verification.
 * Enforces:
 * - Real file type validation by magic bytes (ignoring headers / extensions)
 * - Maximum file size 10 MB
 * - SHA-256 content hashing
 * - Image metadata stripping
 */

import crypto from "crypto";

export const MAX_CERT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface FileValidationResult {
  valid: boolean;
  mimeType?: "application/pdf" | "image/jpeg" | "image/png";
  extension?: ".pdf" | ".jpg" | ".png";
  fileHash: string;
  size: number;
  sanitizedBuffer: Buffer;
  error?: string;
}

/**
 * Validates magic bytes against known signatures
 */
export function detectMagicBytes(buffer: Buffer): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 0x89 'P' 'N' 'G' (0x89 0x50 0x4E 0x47)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  return null;
}

/**
 * Computes deterministic SHA-256 hash of file buffer
 */
export function computeFileSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Strips EXIF metadata from JPEG buffers to prevent privacy leaks and format anomalies
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  // Basic stripping of APP1 (EXIF) segment: 0xFF 0xE1
  let pos = 2;
  while (pos < buffer.length - 4) {
    if (buffer[pos] === 0xff) {
      const marker = buffer[pos + 1];
      // APP1 marker (EXIF)
      if (marker === 0xe1) {
        const segLen = buffer.readUInt16BE(pos + 2);
        // Exclude the EXIF segment
        const before = buffer.subarray(0, pos);
        const after = buffer.subarray(pos + 2 + segLen);
        return Buffer.concat([before, after]);
      } else if (marker === 0xda) {
        // Start of Scan: end of metadata headers
        break;
      } else {
        const segLen = buffer.readUInt16BE(pos + 2);
        pos += 2 + segLen;
      }
    } else {
      pos++;
    }
  }

  return buffer;
}

/**
 * Comprehensive certificate file validation
 */
export function validateCertificateFile(buffer: Buffer): FileValidationResult {
  const size = buffer.length;

  if (size === 0) {
    return {
      valid: false,
      fileHash: "",
      size: 0,
      sanitizedBuffer: buffer,
      error: "Uploaded certificate file is empty.",
    };
  }

  if (size > MAX_CERT_FILE_SIZE_BYTES) {
    return {
      valid: false,
      fileHash: "",
      size,
      sanitizedBuffer: buffer,
      error: "Document file size exceeds the 10 MB limit. Please upload a smaller file.",
    };
  }

  // Magic bytes inspection
  const detectedMime = detectMagicBytes(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      fileHash: "",
      size,
      sanitizedBuffer: buffer,
      error: "Invalid file content format. Only genuine PDF, JPG, and PNG documents are accepted.",
    };
  }

  // Sanitize buffer (strip EXIF if JPEG)
  let sanitizedBuffer = buffer;
  if (detectedMime === "image/jpeg") {
    sanitizedBuffer = stripJpegExif(buffer);
  }

  // Compute SHA-256 hash
  const fileHash = computeFileSha256(sanitizedBuffer);

  const extMap: Record<string, ".pdf" | ".jpg" | ".png"> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };

  return {
    valid: true,
    mimeType: detectedMime,
    extension: extMap[detectedMime],
    fileHash,
    size: sanitizedBuffer.length,
    sanitizedBuffer,
  };
}
