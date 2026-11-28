/**
 * File Storage Interface for Clinical Certificates and Credentials.
 */

export interface SavedFileResult {
  storagePath: string; // Internal identifier or relative path
  size: number;
  mimeType: string;
}

export interface FileStorageProvider {
  id: string;
  saveFile(fileName: string, buffer: Buffer, mimeType: string): Promise<SavedFileResult>;
  getFile(storagePath: string): Promise<Buffer>;
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
}
