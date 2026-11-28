/**
 * Local Disk File Storage Adapter.
 * Default adapter for development and self-hosted environments.
 */

import fs from "fs";
import path from "path";
import type { FileStorageProvider, SavedFileResult } from "./types";

export class LocalFileStorageAdapter implements FileStorageProvider {
  public readonly id = "local-disk";
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "storage", "secure_documents");
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch {
        // Ignored if created in serverless read-only mode
      }
    }
  }

  public async saveFile(fileName: string, buffer: Buffer, mimeType: string): Promise<SavedFileResult> {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    const targetPath = path.join(this.baseDir, fileName);
    fs.writeFileSync(targetPath, buffer);

    const relativePath = path.join("storage", "secure_documents", fileName).replace(/\\/g, "/");

    return {
      storagePath: relativePath,
      size: buffer.length,
      mimeType,
    };
  }

  public async getFile(storagePath: string): Promise<Buffer> {
    const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storagePath);

    // Directory traversal security check
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Access denied: Invalid storage path reference");
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error("Document file missing from local secure storage");
    }

    return fs.readFileSync(fullPath);
  }

  public async getSignedUrl(storagePath: string): Promise<string> {
    // For local storage, returns the internal secure proxy route URL
    return `/api/caretakers/documents/download?path=${encodeURIComponent(storagePath)}`;
  }
}
