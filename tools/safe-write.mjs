/**
 * Link-safe, atomic writes for trusted local state outside StateStore's report/scope kinds:
 * model config, agent sessions, guided-audit runs, saved prompts and the user-level credentials file.
 * Same rules as StateStore: no symlinked ancestor below `base`, no symlinked or hard-linked target,
 * write to a fresh temporary file (O_EXCL, 0600) and rename it into place.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class StateLinkError extends Error {
  constructor() {
    super("STATE_LINK_BLOCKED");
    this.code = "STATE_LINK_BLOCKED";
  }
}

/** Ensure every directory from `base` down to `dir` exists as a real directory (never a link). */
export function ensureRealDir(base, dir, { create = true } = {}) {
  const rel = path.relative(base, dir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new StateLinkError();
  let cursor = base;
  for (const part of rel ? rel.split(path.sep) : []) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) {
      if (!create) { const missing = new Error("ENOENT"); missing.code = "ENOENT"; throw missing; }
      fs.mkdirSync(cursor, { mode: 0o700 });
    }
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new StateLinkError();
  }
  return dir;
}

/** Refuse a target that is a link, a hard link or not a regular file. Missing is fine. */
export function assertPlainTarget(file) {
  if (!fs.existsSync(file) && !isDanglingLink(file)) return;
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) throw new StateLinkError();
}

function isDanglingLink(file) {
  try { return fs.lstatSync(file).isSymbolicLink(); } catch { return false; }
}

/** Atomically write `content` to `file`, whose parent chain below `base` must be real directories. */
export function writeStateFile(base, file, content) {
  ensureRealDir(base, path.dirname(file));
  assertPlainTarget(file);
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    assertPlainTarget(file);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return file;
}

/** Read a state file only when it is a plain, single-link regular file below real directories. */
export function readStateFile(base, file) {
  ensureRealDir(base, path.dirname(file), { create: false });
  if (!fs.existsSync(file) && !isDanglingLink(file)) {
    const error = new Error("ENOENT");
    error.code = "ENOENT";
    throw error;
  }
  assertPlainTarget(file);
  return fs.readFileSync(file, "utf8");
}
