import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");

if (fs.existsSync(standaloneDir)) {
  const staticSrc = path.join(rootDir, ".next", "static");
  const staticDest = path.join(standaloneNextDir, "static");
  const publicSrc = path.join(rootDir, "public");
  const publicDest = path.join(standaloneDir, "public");

  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
    console.log("✔ Copied .next/static to .next/standalone/.next/static");
  }

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
    console.log("✔ Copied public to .next/standalone/public");
  }
} else {
  console.log("ℹ No .next/standalone directory found. Skipping asset copy.");
}
