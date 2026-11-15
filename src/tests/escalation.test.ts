import { describe, it, expect } from "vitest";
import { sendEmail, generateBaseEmailWrapper } from "@/lib/email/service";

describe("CareNest Escalation & Proactive Notification Infrastructure", () => {
  it("renders responsive healthcare email template with clinical metadata", () => {
    const title = "Urgent Escalation: Unconfirmed Dose";
    const body = `<p>Test escalation body</p>`;
    const html = generateBaseEmailWrapper(title, body);

    expect(html).toContain("CareNest");
    expect(html).toContain("One connected circle of care");
    expect(html).toContain("Test escalation body");
    expect(html).toContain("Confidential Patient Information");
  });

  it("handles development mock email fallback safely without hardcoded credentials", async () => {
    const result = await sendEmail({
      to: "caregiver@example.com",
      subject: "Test Escalation Dispatch",
      html: "<p>Dose missed alert</p>",
      type: "ESCALATION",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("LOCAL_FALLBACK");
    expect(result.isSimulated).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
