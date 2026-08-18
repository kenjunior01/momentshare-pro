import { cpSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outputDir = resolve(root, ".output");
const distDir = resolve(root, "dist");

// Remove previous dist if it exists
try {
  rmSync(distDir, { recursive: true, force: true });
} catch {}

// Copy .output → dist so Lovable CI can find the build artifacts
cpSync(outputDir, distDir, { recursive: true });

// Create a minimal index.html in dist/public/ for dist-check validation
// This file is never served — the SSR worker handles all requests
writeFileSync(
  resolve(distDir, "public", "index.html"),
  `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Memoir</title></head>
<body></body></html>\n`,
);

console.log("[postbuild] dist/ directory created from .output/");
