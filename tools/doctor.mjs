/**
 * `cda doctor`: a local readiness check. Fixed, argument-only probes (`--version`), no shell,
 * no network, no target access. Tells the operator what works and the exact next step.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectProviders } from "./providers.mjs";
import { findBrowser } from "./visual.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function version(bin, execImpl) {
  for (const candidate of process.platform === "win32" ? [`${bin}.exe`, `${bin}.cmd`, bin] : [bin]) {
    try {
      return String(execImpl(candidate, ["--version"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"], windowsHide: true })).trim().split(/\r?\n/)[0].slice(0, 60);
    } catch { /* next */ }
  }
  return null;
}

export function runDoctor({ rootDir = ROOT, env = process.env, execImpl = execFileSync } = {}) {
  const checks = [];
  const add = (id, ok, detail, fix = null, level = ok ? "ok" : "warn") => checks.push({ id, status: ok ? "ok" : level, detail, fix });
  const major = Number(process.versions.node.split(".")[0]);
  add("node", major >= 22, `Node.js ${process.versions.node}`, "Install Node.js 22 LTS or newer", "fail");
  const git = version("git", execImpl);
  add("git", Boolean(git), git ?? "git not found", "Install Git (needed for --git-staged scopes)");
  const browser = findBrowser(process.platform, env);
  add("pdf", Boolean(browser), browser ? `PDF printer: ${path.basename(browser)}` : "No Chromium-based browser for --pdf", "Install Chrome/Edge/Chromium or set CDA_BROWSER; HTML reports still work");
  const cdaDir = path.join(rootDir, ".cda");
  let reports = 0;
  try { reports = fs.readdirSync(path.join(cdaDir, "reports")).filter((f) => f.endsWith(".json")).length; } catch { /* none yet */ }
  add("state", true, `.cda/ ${fs.existsSync(cdaDir) ? "present" : "not created yet"} · ${reports} stored reports`);
  let ignored = false;
  try { ignored = /^\.cda\/$/m.test(fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8")); } catch { /* no gitignore */ }
  add("gitignore", ignored, ignored ? ".cda/ is git-ignored" : ".cda/ is NOT git-ignored", "Add .cda/ to .gitignore so private reports are never committed", "fail");
  const { providers, config } = detectProviders({ env, execImpl, rootDir });
  const ready = providers.filter((p) => p.ready && !p.local);
  add("model", ready.length > 0, ready.length ? `Ready: ${ready.map((p) => p.id).join(", ")}${config.provider ? ` · selected ${config.provider}` : ""}` : "No model connected (optional)", "Optional: node tools/cda.mjs connect --provider claude-code|codex|openrouter|anthropic|openai|ollama");
  const skills = [".claude/skills/cyber-defense/SKILL.md", ".agents/skills/cyber-defense/SKILL.md", ".hermes/skills/cyber-defense/SKILL.md"].filter((f) => fs.existsSync(path.join(rootDir, f)));
  add("skills", skills.length === 3, `${skills.length}/3 host entry points`, "Restore the .claude/.agents/.hermes entry points from git");
  const failed = checks.filter((c) => c.status === "fail").length;
  return { format: "cda.doctor.v1", ok: failed === 0, failed, warnings: checks.filter((c) => c.status === "warn").length, checks, providers, network: false };
}

export function renderDoctor(result, lang = "pl") {
  const pl = lang === "pl";
  const icon = { ok: "\x1b[32m✓\x1b[0m", warn: "\x1b[33m!\x1b[0m", fail: "\x1b[31m✗\x1b[0m" };
  const lines = result.checks.map((c) => `  ${icon[c.status]} ${c.id.padEnd(10)} ${c.detail}${c.status !== "ok" && c.fix ? `\n               \x1b[2m→ ${c.fix}\x1b[0m` : ""}`);
  const provider = result.providers.map((p) => `  ${p.ready ? icon.ok : icon.warn} ${p.id.padEnd(12)} ${(pl ? p.labelPl : p.label)}${p.ready ? "" : `\n               \x1b[2m→ ${p.setup}\x1b[0m`}`);
  return `\n\x1b[1m🛡️  Cyber Defense Agent — ${pl ? "diagnostyka środowiska" : "environment check"}\x1b[0m ${pl ? "(lokalnie, bez sieci)" : "(local only, no network)"}\n\n${lines.join("\n")}\n\n\x1b[1m${pl ? "Połączenie z modelem" : "Model connection"}\x1b[0m\n${provider.join("\n")}\n\n${result.ok ? (pl ? "Gotowe. Zacznij od: node tools/demo.mjs" : "Ready. Start with: node tools/demo.mjs") : (pl ? "Napraw pozycje oznaczone ✗." : "Fix the items marked ✗.")}\n`;
}
