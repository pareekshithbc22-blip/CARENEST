import { NextResponse } from "next/server";
import crypto from "crypto";
import { validateCertificateFile } from "@/lib/verification/security/file-validator";
import { getFileScanner } from "@/lib/verification/security/file-scanner";
import { getFileStorage } from "@/lib/verification/storage";
import { verifyUploadToken, cleanOrphanUploadedFiles } from "@/lib/security";
import {
  checkPersistentRateLimit,
  recordPersistentFailedAttempt,
  resetPersistentRateLimit,
} from "@/lib/services/rate-limit-service";

export async function POST(req: Request) {
  try {
    // 1. Content-Length pre-check: Reject files > 10 MB before reading body into memory
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed file size is 10 MB." },
        { status: 413 }
      );
    }

    // 2. IP extraction & Persistent Rate Limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateStatus = await checkPersistentRateLimit({
      action: "UPLOAD",
      identifier: ip,
      ip,
    });

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many upload attempts from this network. Please try again in ${Math.ceil(
            (rateStatus.remainingSeconds || 900) / 60
          )} minutes.`,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();

    // 3. Upload Token requirement (Short-lived HMAC token issued by registration step)
    const uploadToken =
      (formData.get("uploadToken") as string) ||
      req.headers.get("x-upload-token") ||
      null;

    if (!uploadToken || !verifyUploadToken(uploadToken)) {
      await recordPersistentFailedAttempt({
        action: "UPLOAD",
        identifier: ip,
        ip,
      });
      return NextResponse.json(
        {
          error:
            "Access denied: Missing, invalid, or expired upload token. Please restart your registration to obtain a fresh token.",
        },
        { status: 403 }
      );
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No document file was uploaded. Please attach your professional certificate." },
        { status: 400 }
      );
    }

    const blob = file as File;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Strict magic bytes, size (<= 10MB), and content validation
    const validation = validateCertificateFile(buffer);
    if (!validation.valid || !validation.mimeType || !validation.extension) {
      await recordPersistentFailedAttempt({
        action: "UPLOAD",
        identifier: ip,
        ip,
      });
      return NextResponse.json(
        { error: validation.error || "Invalid document format. Please upload an authentic PDF, JPG, or PNG document." },
        { status: 400 }
      );
    }

    // 5. Antivirus file scan hook
    const scanner = getFileScanner();
    const scanResult = await scanner.scan(validation.sanitizedBuffer, blob.name);
    if (!scanResult.clean) {
      await recordPersistentFailedAttempt({
        action: "UPLOAD",
        identifier: ip,
        ip,
      });
      return NextResponse.json(
        { error: `Security check failed: Malicious content detected (${scanResult.threatName || "Suspicious File"}). Upload declined.` },
        { status: 400 }
      );
    }

    // 6. Save via abstract FileStorage adapter (Local disk or S3)
    const storage = getFileStorage();
    const uniqueFileName = `cert_${Date.now()}_${crypto.randomUUID()}${validation.extension}`;
    const saved = await storage.saveFile(uniqueFileName, validation.sanitizedBuffer, validation.mimeType);

    // Reset rate limiter on successful upload
    await resetPersistentRateLimit("UPLOAD", ip, ip);

    // Asynchronously trigger orphan document cleanup (> 24 hours) without blocking client response
    cleanOrphanUploadedFiles().catch((e) => {
      console.warn("[Orphan file cleanup background warning]:", e);
    });

    return NextResponse.json({
      success: true,
      documentFileName: blob.name,
      documentFilePath: saved.storagePath,
      documentMimeType: validation.mimeType,
      documentFileSize: saved.size,
      documentHash: validation.fileHash,
      message: "Certificate uploaded securely to CARENEST document vault.",
    });
  } catch (error: any) {
    console.error("[Document Upload Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during certificate upload" },
      { status: 500 }
    );
  }
}
