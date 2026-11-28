# CareNest Verification Provider Integration Guide

This guide describes how enterprise buyers and platform integrators can connect real state licensing registries, OCR engines, identity-binding services, and object storage buckets to CARENEST.

---

## 1. Registry Provider Architecture

All licensing council lookups are abstracted behind the `RegistryProvider` interface (`src/lib/verification/providers/types.ts`):

```typescript
export interface RegistryProvider {
  id: string;
  name: string;
  authoritative: boolean;
  supports(authority: string, state?: string | null, category?: string): boolean;
  lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult>;
}
```

### Error Taxonomy
- **`FOUND`**: The registration record was located in the official council register.
- **`NOT_FOUND`**: The council register responded affirmatively that no record matches this number. *(Routes to Manual Review — never auto-rejected).*
- **`UNAVAILABLE`**: The council portal, network, or upstream service is temporarily offline or timed out.
- **`RATE_LIMITED`**: The upstream portal enquiry quota has been reached.

---

## 2. Implementing a Custom Registry Adapter

Below is an example skeleton showing how to connect an external state council portal or government API (e.g. a state nursing council API).

```typescript
// src/lib/verification/providers/custom-council-provider.ts
import type { RegistryProvider, RegistryLookupQuery, RegistryLookupResult } from "./types";

export class CustomStateCouncilProvider implements RegistryProvider {
  public readonly id = "custom-state-council";
  public readonly name = "Official State Nursing Council Portal";
  public readonly authoritative = true;

  public supports(authority: string, state?: string | null): boolean {
    const norm = authority.toLowerCase();
    return norm.includes("karnataka") || norm.includes("knc") || state === "Karnataka";
  }

  public async lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult> {
    const apiKey = process.env.COUNCIL_API_KEY;
    const apiUrl = process.env.COUNCIL_API_URL;

    if (!apiKey || !apiUrl) {
      return {
        outcome: "UNAVAILABLE",
        authoritative: false,
        checkedAt: new Date(),
        providerId: this.id,
        message: "Council API credentials not configured.",
      };
    }

    try {
      const response = await fetch(`${apiUrl}/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          regNumber: query.registrationNumber,
        }),
      });

      if (response.status === 429) {
        return { outcome: "RATE_LIMITED", authoritative: true, checkedAt: new Date(), providerId: this.id };
      }

      if (response.status === 404) {
        return { outcome: "NOT_FOUND", authoritative: true, checkedAt: new Date(), providerId: this.id };
      }

      if (!response.ok) {
        return { outcome: "UNAVAILABLE", authoritative: false, checkedAt: new Date(), providerId: this.id };
      }

      const data = await response.json();
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: data.licenseeName,
          registrationNumber: data.registrationNumber,
          status: data.licenseStatus, // "ACTIVE", "REVOKED", "SUSPENDED", "EXPIRED"
          validFrom: data.issuedDate,
          validUntil: data.expiryDate,
          qualification: data.qualificationTitle,
          authority: this.name,
        },
      };
    } catch (err: any) {
      return {
        outcome: "UNAVAILABLE",
        authoritative: false,
        checkedAt: new Date(),
        providerId: this.id,
        message: err.message,
      };
    }
  }
}
```

### Registering the Adapter
To activate your adapter, register it in `src/lib/verification/providers/registry.ts`:

```typescript
import { CustomStateCouncilProvider } from "./custom-council-provider";

// Inside ProviderRegistry constructor:
this.register(new CustomStateCouncilProvider());
```

---

## 3. Connecting Cloud OCR (AWS Textract / Google Cloud Vision)

The default OCR engine extracts embedded text layers from PDFs. For enterprise deployments processing physical photo scans, implement `OcrProvider` (`src/lib/verification/providers/ocr.ts`):

```typescript
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import type { OcrProvider, OcrExtractionResult } from "./ocr";

export class AwsTextractOcrProvider implements OcrProvider {
  public readonly id = "aws-textract";
  private client = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });

  public async extractText(buffer: Buffer, mimeType: string): Promise<OcrExtractionResult> {
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: buffer },
    });

    const response = await this.client.send(command);
    const lines = (response.Blocks || [])
      .filter((b) => b.BlockType === "LINE" && b.Text)
      .map((b) => b.Text!);

    const rawText = lines.join(" ");
    const fields = parseLicensingFieldsFromText(rawText);

    return { rawText, fields };
  }
}
```

Activate it via:
```typescript
import { setOcrProvider } from "@/lib/verification/providers/ocr";
setOcrProvider(new AwsTextractOcrProvider());
```

---

## 4. Connecting Private S3 Object Storage

To store certificates in AWS S3, Cloudflare R2, or Supabase Storage:
1. Set `FILE_STORAGE_ADAPTER="s3"` in `.env`.
2. Configure `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
3. The platform will automatically generate short-lived signed URLs (15 minutes) for document downloads, keeping documents strictly private.

---

## 5. Production Go-Live Checklist

- [ ] `VERIFICATION_DEV_SANDBOX` is disabled or unset in production environment.
- [ ] At least one platform administrator account has been promoted via `npx tsx scripts/create-admin.ts`.
- [ ] Upstream registry API keys are added to environment variables.
- [ ] S3 bucket permissions are restricted to private access only (no public bucket policy).
- [ ] Cloud Scheduler is invoking `/api/verification/process` every minute with `Authorization: Bearer <CRON_SECRET>`.
