/**
 * Optical Character Recognition (OCR) and Text Extraction Engine.
 * Extracts text layers from PDF documents and images, and parses clinical licensing fields.
 */

export interface ExtractedField {
  value: string;
  confidence: number; // 0.0 to 1.0
}

export interface OcrExtractionResult {
  rawText: string;
  fields: {
    name?: ExtractedField;
    registrationNumber?: ExtractedField;
    authority?: ExtractedField;
    qualification?: ExtractedField;
    validFrom?: ExtractedField;
    validUntil?: ExtractedField;
  };
  metadata?: {
    creator?: string;
    producer?: string;
    format?: string;
  };
}

export interface OcrProvider {
  id: string;
  extractText(buffer: Buffer, mimeType: string): Promise<OcrExtractionResult>;
}

/**
 * Extracts metadata and ASCII text streams from PDF buffer without heavy native binaries
 */
export function extractTextFromPdfBuffer(buffer: Buffer): { rawText: string; metadata: { creator?: string; producer?: string } } {
  const content = buffer.toString("binary");
  let rawText = "";

  // 1. Extract metadata (Creator, Producer)
  const creatorMatch = content.match(/\/Creator\s*\(([^)]+)\)/i);
  const producerMatch = content.match(/\/Producer\s*\(([^)]+)\)/i);
  const metadata = {
    creator: creatorMatch ? creatorMatch[1].trim() : undefined,
    producer: producerMatch ? producerMatch[1].trim() : undefined,
  };

  // 2. Extract plain text segments inside text blocks: BT ... ET
  const textBlocks = content.match(/BT[\s\S]*?ET/g) || [];
  const extractedLines: string[] = [];

  for (const block of textBlocks) {
    // Matches text inside parens: (text) Tj or [(text)] TJ
    const matches = block.match(/\(([^)]+)\)\s*(?:Tj|'|")/g) || [];
    for (const m of matches) {
      const textMatch = m.match(/\(([^)]+)\)/);
      if (textMatch && textMatch[1]) {
        extractedLines.push(textMatch[1]);
      }
    }

    const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/g) || [];
    for (const arrayBlock of tjArrayMatches) {
      const innerTexts = arrayBlock.match(/\(([^)]+)\)/g) || [];
      const combined = innerTexts.map((t) => t.replace(/[()]/g, "")).join("");
      if (combined) {
        extractedLines.push(combined);
      }
    }
  }

  rawText = extractedLines.join(" ");

  // If BT/ET blocks yielded little, scan printable strings
  if (rawText.length < 20) {
    const printable = content.replace(/[^a-zA-Z0-9\s.,\-\/:#]/g, " ");
    rawText = printable.replace(/\s+/g, " ").slice(0, 5000);
  }

  return { rawText, metadata };
}

/**
 * Parses structured clinical licensing fields from raw extracted text
 */
export function parseLicensingFieldsFromText(text: string): OcrExtractionResult["fields"] {
  const fields: OcrExtractionResult["fields"] = {};
  if (!text) return fields;

  const normalized = text.replace(/\s+/g, " ");

  // 1. Registration Number parsing: patterns like "Reg No:", "Registration No.", "Reg. No. 12345/2020", "RN-123456"
  const regMatch =
    normalized.match(/(?:reg(?:istration)?\s*(?:no\.?|num(?:ber)?|#)?|license\s*no\.?)\s*[:.-]?\s*([A-Za-z0-9\/-]{4,20})/i) ||
    normalized.match(/\b([A-Z]{2,4}[-\/]?\d{4,8})\b/);

  if (regMatch && regMatch[1]) {
    fields.registrationNumber = {
      value: regMatch[1].trim(),
      confidence: 0.85,
    };
  }

  // 2. Name parsing: patterns like "This is to certify that [Name]", "Name: [Name]", "Mr/Ms/Dr [Name]"
  const nameMatch =
    normalized.match(/(?:certify\s+that|name\s*[:.-]|held\s+by)\s+([A-Za-z\s.]{3,30})(?:has|is|bearing|registration)/i) ||
    normalized.match(/(?:Dr|Sister|Nurse|Mr|Ms|Mrs)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);

  if (nameMatch && nameMatch[1]) {
    fields.name = {
      value: nameMatch[1].trim(),
      confidence: 0.8,
    };
  }

  // 3. Authority parsing: looks for "Council", "Board", "Commission"
  const authMatch = normalized.match(/([A-Za-z\s]+(?:nursing|medical|midwives)\s+(?:council|board|commission))/i);
  if (authMatch && authMatch[1]) {
    fields.authority = {
      value: authMatch[1].trim(),
      confidence: 0.85,
    };
  }

  // 4. Qualification parsing
  const qualMatch = normalized.match(/\b(b\.?sc\.?\s*nursing|g\.?n\.?m\.?|m\.?b\.?b\.?s\.?|a\.?n\.?m\.?|general nursing|physician assistant)\b/i);
  if (qualMatch && qualMatch[1]) {
    fields.qualification = {
      value: qualMatch[1].trim(),
      confidence: 0.9,
    };
  }

  return fields;
}

/**
 * Standard Built-in OCR Provider
 */
export class DefaultOcrProvider implements OcrProvider {
  public readonly id = "default-text-ocr";

  public async extractText(buffer: Buffer, mimeType: string): Promise<OcrExtractionResult> {
    if (mimeType === "application/pdf") {
      const { rawText, metadata } = extractTextFromPdfBuffer(buffer);
      const fields = parseLicensingFieldsFromText(rawText);
      return { rawText, fields, metadata };
    }

    // For JPG/PNG: return clean empty extraction (or tesseract fallback when configured)
    return {
      rawText: "",
      fields: {},
      metadata: { format: mimeType },
    };
  }
}

let activeOcrProvider: OcrProvider = new DefaultOcrProvider();

export function setOcrProvider(provider: OcrProvider): void {
  activeOcrProvider = provider;
}

export function getOcrProvider(): OcrProvider {
  return activeOcrProvider;
}
