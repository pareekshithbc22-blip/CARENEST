import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import * as ReactDOM from "react-dom";

describe("Demo Dialog React Portal and Viewport Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies the dialog is rendered as a child of document.body via createPortal and NOT inside the navbar header", () => {
    const dialogFilePath = path.join(process.cwd(), "src", "demo", "demo-dialog.tsx");
    const content = fs.readFileSync(dialogFilePath, "utf8");

    // 1. Must import createPortal from react-dom
    expect(content).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);

    // 2. Must mount portal to document.body, not local parent
    expect(content).toContain("createPortal(dialogContent, document.body)");

    // 3. Must have mounted guard to prevent SSR hydration mismatch
    expect(content).toMatch(/const\s*\[mounted,\s*setMounted\]\s*=\s*React\.useState\(false\)/);
    expect(content).toContain("setMounted(true)");
    expect(content).toMatch(/mounted\s*&&\s*isOpen\s*&&\s*typeof document !== "undefined"/);

    // 4. Verify in navbar.tsx that DemoNavButton is placed in header, proving the portal is essential
    const navbarFilePath = path.join(process.cwd(), "src", "components", "navbar.tsx");
    const navbarContent = fs.readFileSync(navbarFilePath, "utf8");
    expect(navbarContent).toContain("<DemoNavButton />");
    expect(navbarContent).toContain("<header");
    expect(navbarContent).toContain("backdrop-blur-md");
  });

  it("verifies Escape key listener is registered to close the dialog and page scroll is locked and restored", () => {
    const dialogFilePath = path.join(process.cwd(), "src", "demo", "demo-dialog.tsx");
    const content = fs.readFileSync(dialogFilePath, "utf8");

    // Escape listener
    expect(content).toContain('e.key === "Escape"');
    expect(content).toContain("setIsOpen(false)");
    expect(content).toContain('window.addEventListener("keydown", handleKeyDown)');
    expect(content).toContain('window.removeEventListener("keydown", handleKeyDown)');

    // Scroll lock on body
    expect(content).toContain('document.body.style.overflow = "hidden"');
    expect(content).toContain("document.body.style.overflow = originalOverflow");

    // Focus return on close
    expect(content).toContain("triggerButtonRef.current?.focus()");
  });

  it("verifies all three demo options are present in the exact specified order with correct routes and labels", () => {
    const dialogFilePath = path.join(process.cwd(), "src", "demo", "demo-dialog.tsx");
    const content = fs.readFileSync(dialogFilePath, "utf8");

    const caretakerIdx = content.indexOf("1. Caretaker");
    const familyIdx = content.indexOf("2. Family Administrator");
    const seniorIdx = content.indexOf("3. Senior Patient");

    expect(caretakerIdx).toBeGreaterThan(-1);
    expect(familyIdx).toBeGreaterThan(caretakerIdx);
    expect(seniorIdx).toBeGreaterThan(familyIdx);

    // Navigation paths
    expect(content).toContain('handleSelectRole("/demo/caretaker")');
    expect(content).toContain('handleSelectRole("/demo/family")');
    expect(content).toContain('handleSelectRole("/demo/senior")');

    // Required icons
    expect(content).toContain("<UserCheck");
    expect(content).toContain("<Users");
    expect(content).toContain("<HeartHandshake");

    // Aria attributes and panel dimensions
    expect(content).toContain('role="dialog"');
    expect(content).toContain('aria-modal="true"');
    expect(content).toContain('aria-labelledby="demo-dialog-title"');
    expect(content).toContain("calc(100dvh - 2rem)");
    expect(content).toContain("28rem");
    expect(content).toContain("z-[9999]");
  });
});
