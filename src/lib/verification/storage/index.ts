/**
 * Central Storage Provider Factory.
 * Resolves between Local Disk (development default) and S3-Compatible Storage based on configuration.
 */

import type { FileStorageProvider } from "./types";
import { LocalFileStorageAdapter } from "./local-storage";
import { S3FileStorageAdapter } from "./s3-storage";

let storageInstance: FileStorageProvider | null = null;

export function getFileStorage(): FileStorageProvider {
  if (storageInstance) return storageInstance;

  const adapterType = process.env.FILE_STORAGE_ADAPTER?.toLowerCase().trim();

  if (adapterType === "s3" || process.env.S3_BUCKET) {
    storageInstance = new S3FileStorageAdapter();
  } else {
    storageInstance = new LocalFileStorageAdapter();
  }

  return storageInstance;
}

export * from "./types";
