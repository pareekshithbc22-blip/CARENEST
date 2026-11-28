/**
 * S3-Compatible Private Object Storage Adapter.
 * Works seamlessly with AWS S3, Cloudflare R2, and Supabase Storage S3.
 * Configured via environment variables:
 * - S3_BUCKET
 * - S3_REGION
 * - S3_ENDPOINT (Optional: for Cloudflare R2 / MinIO / Supabase)
 * - S3_ACCESS_KEY_ID
 * - S3_SECRET_ACCESS_KEY
 */

import crypto from "crypto";
import type { FileStorageProvider, SavedFileResult } from "./types";

export class S3FileStorageAdapter implements FileStorageProvider {
  public readonly id = "s3-compatible";
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    this.region = process.env.S3_REGION || "us-east-1";
    this.endpoint = process.env.S3_ENDPOINT;
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  }

  public async saveFile(fileName: string, buffer: Buffer, mimeType: string): Promise<SavedFileResult> {
    const s3Key = `certificates/${fileName}`;

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        "S3 Storage is enabled but missing configuration: S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY"
      );
    }

    // In environments with AWS SDK or REST PUT signed requests:
    // We execute signed PUT request to the S3 bucket
    const host = this.endpoint
      ? new URL(this.endpoint).host
      : `${this.bucket}.s3.${this.region}.amazonaws.com`;

    const url = this.endpoint
      ? `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${s3Key}`
      : `https://${host}/${s3Key}`;

    // Standard AWS SigV4 signed PUT request
    const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = dateStr.slice(0, 8);
    const service = "s3";

    // Prepare auth headers
    const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateStr}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = `PUT\n/${this.endpoint ? `${this.bucket}/` : ""}${s3Key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${dateStamp}/${this.region}/${service}/aws4_request\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = crypto.createHmac("sha256", `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${dateStamp}/${this.region}/${service}/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Host: host,
        "Content-Type": mimeType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": dateStr,
        Authorization: authHeader,
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`S3 upload failed (${res.status}): ${errText}`);
    }

    return {
      storagePath: `s3://${this.bucket}/${s3Key}`,
      size: buffer.length,
      mimeType,
    };
  }

  public async getFile(storagePath: string): Promise<Buffer> {
    const s3Key = storagePath.replace(`s3://${this.bucket}/`, "");
    const signedUrl = await this.getSignedUrl(storagePath, 300);

    const res = await fetch(signedUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch file from S3 bucket (${res.status})`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async getSignedUrl(storagePath: string, expiresInSeconds = 900): Promise<string> {
    const s3Key = storagePath.replace(`s3://${this.bucket}/`, "");
    const host = this.endpoint
      ? new URL(this.endpoint).host
      : `${this.bucket}.s3.${this.region}.amazonaws.com`;

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = dateStr.slice(0, 8);
    const service = "s3";

    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const queryParams = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(`${this.accessKeyId}/${credentialScope}`)}`,
      `X-Amz-Date=${dateStr}`,
      `X-Amz-Expires=${expiresInSeconds}`,
      `X-Amz-SignedHeaders=host`,
    ].join("&");

    const canonicalRequest = `GET\n/${this.endpoint ? `${this.bucket}/` : ""}${s3Key}\n${queryParams}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = crypto.createHmac("sha256", `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const basePath = this.endpoint ? `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${s3Key}` : `https://${host}/${s3Key}`;
    return `${basePath}?${queryParams}&X-Amz-Signature=${signature}`;
  }
}
