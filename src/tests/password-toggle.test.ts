import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Password Visibility Toggle Specification Verification", () => {
  it("verifies login page has button type='button' with aria-label and aria-pressed", () => {
    const loginFilePath = path.join(process.cwd(), "src", "app", "login", "page.tsx");
    const content = fs.readFileSync(loginFilePath, "utf8");

    // Must have type="button"
    expect(content).toMatch(/<button[\s\S]*?type="button"[\s\S]*?aria-label={showPassword \? "Hide password" : "Show password"}/);
    expect(content).toMatch(/aria-pressed={showPassword}/);
    expect(content).toMatch(/type={showPassword \? "text" : "password"}/);

    // Must NOT add password toggle to PIN fields
    expect(content).not.toMatch(/id="pin"[\s\S]*?type={showPassword/);
  });

  it("verifies register page has button type='button' with aria-label and aria-pressed", () => {
    const registerFilePath = path.join(process.cwd(), "src", "app", "register", "page.tsx");
    const content = fs.readFileSync(registerFilePath, "utf8");

    // Must have type="button"
    expect(content).toMatch(/<button[\s\S]*?type="button"[\s\S]*?aria-label={showPassword \? "Hide password" : "Show password"}/);
    expect(content).toMatch(/aria-pressed={showPassword}/);
    expect(content).toMatch(/type={showPassword \? "text" : "password"}/);

    // Must NOT add to OTP fields: OTP mapping uses 6 single-digit text inputs without password toggle
    expect(content).toMatch(/otp\.map\(\(digit,\s*idx\)/);
    expect(content).toMatch(/handleOtpChange/);
  });
});
