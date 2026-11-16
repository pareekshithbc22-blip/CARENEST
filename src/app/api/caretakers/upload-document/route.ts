import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

/**
 * Validates file buffer magic bytes to prevent file spoofing
 */
function isValidFileHeader(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  if (mimeType === "application/pdf") {
    // %PDF-
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    // 0xFF, 0xD8, 0xFF
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    // 0x89, 'P', 'N', 'G'
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No document file was uploaded. Please attach your professional certificate." },
        { status: 400 }
      );
    }

    const blob = file as File;

    // 1. File size check
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Document file size exceeds the 10 MB limit. Please upload a smaller file." },
        { status: 400 }
      );
    }

    if (blob.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    // 2. MIME type check
    const mimeType = blob.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Invalid document format. Only PDF, JPG, and PNG files are supported." },
        { status: 400 }
      );
    }

    // 3. Extension check
    const originalExt = path.extname(blob.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(originalExt)) {
      return NextResponse.json(
        { error: `Invalid file extension (${originalExt}). Only .pdf, .jpg, and .png are permitted.` },
        { status: 400 }
      );
    }

    // 4. Magic bytes content verification
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isValidFileHeader(buffer, mimeType)) {
      return NextResponse.json(
        { error: "File content does not match its declared format. Please upload an authentic PDF, JPG, or PNG document." },
        { status: 400 }
      );
    }

    // 5. Ensure secure destination directory exists
    const secureStorageDir = path.resolve(process.cwd(), "storage", "secure_documents");
    if (!fs.existsSync(secureStorageDir)) {
      fs.mkdirSync(secureStorageDir, { recursive: true });
    }

    // 6. Write securely with non-predictable UUID filename
    const sanitizedExt = originalExt || (mimeType === "application/pdf" ? ".pdf" : ".jpg");
    const uniqueFileName = `cert_${Date.now()}_${crypto.randomUUID()}${sanitizedExt}`;
    const destinationPath = path.join(secureStorageDir, uniqueFileName);

    fs.writeFileSync(destinationPath, buffer);

    const relativePath = path.join("storage", "secure_documents", uniqueFileName).replace(/\\/g, "/");

    return NextResponse.json({
      success: true,
      documentFileName: blob.name,
      documentFilePath: relativePath,
      documentMimeType: mimeType,
      documentFileSize: blob.size,
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
