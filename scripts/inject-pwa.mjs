// Post-build: inject PWA manifest + icon tags into dist/index.html.
// Expo's default web export (output: "single") ignores app/+html.tsx, so the
// shipped index.html has no <link rel="manifest"> and Chrome's Add-to-Home-
// Screen falls back to the favicon. This script closes that gap.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const htmlPath = resolve("dist/index.html");
const tags = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#FC9853" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Home Manager" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

const html = await readFile(htmlPath, "utf8");
if (html.includes('rel="manifest"')) {
  console.log("[inject-pwa] manifest link already present — skipping");
  process.exit(0);
}
const patched = html.replace("</head>", `${tags}\n  </head>`);
if (patched === html) {
  console.error("[inject-pwa] ERROR: no </head> tag found in dist/index.html");
  process.exit(1);
}
await writeFile(htmlPath, patched, "utf8");
console.log("[inject-pwa] injected PWA tags into dist/index.html");
