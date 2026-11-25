import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { findBrowser } from "./visual.mjs";

const runBrowser = promisify(execFile);
export function isPdf(bytes) {
  return Buffer.isBuffer(bytes) && bytes.length > 1000 && bytes.subarray(0, 5).toString() === "%PDF-";
}

/** Consent is enforced by the caller. A fresh profile avoids the user's open browser session. */
export async function createPdf(html, destination, { browser = findBrowser(), run = runBrowser } = {}) {
  if (!browser) throw new Error("NO_CHROMIUM_BROWSER_FOUND");
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const scratch = fs.mkdtempSync(path.join(temporaryRoot, "cda-pdf-"));
  const input = path.join(scratch, "report.html");
  const output = path.join(scratch, "report.pdf");
  // Always print an immutable snapshot, with no scripts or remote resources allowed.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">`;
  fs.writeFileSync(input, html.replace(/<head>/i, `<head>${policy}`), { flag: "wx" });
  const args = ["--headless", "--disable-gpu", "--disable-extensions", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-first-run", "--no-default-browser-check", "--no-pdf-header-footer", `--user-data-dir=${path.join(scratch, "profile")}`, `--print-to-pdf=${output}`];
  if (process.platform === "linux" && process.getuid?.() === 0) args.push("--no-sandbox");
  args.push(pathToFileURL(input).href);
  try {
    await run(browser, args, { timeout: 90_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true, shell: false });
    const bytes = fs.readFileSync(output);
    if (!isPdf(bytes)) throw new Error("PDF_PRINT_FAILED");
    fs.writeFileSync(destination, bytes, { flag: "wx" });
    return { bytes: bytes.length };
  } catch {
    throw new Error("PDF_PRINT_FAILED");
  } finally {
    // Only the directory returned by mkdtemp under the verified temporary root is removed.
    if (path.dirname(scratch) === temporaryRoot && path.basename(scratch).startsWith("cda-pdf-")) {
      try { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* Browser shutdown may briefly lock its temporary profile on Windows. */ }
    }
  }
}
