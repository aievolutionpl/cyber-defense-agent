import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Resolve a path strictly inside baseDir. Rejects traversal (..), null bytes, drive prefixes,
 * or any resolved target that escapes baseDir.
 */
export function resolveContainedPath(baseDir, ...segments) {
  if (typeof baseDir !== "string" || !baseDir) {
    const err = new Error("PATH_OUTSIDE_BOUNDARY");
    err.code = "PATH_OUTSIDE_BOUNDARY";
    throw err;
  }
  for (const seg of segments) {
    if (
      typeof seg !== "string" ||
      !seg ||
      seg.includes("\0") ||
      seg.includes("..") ||
      seg.includes(":") ||
      seg.startsWith("/") ||
      seg.startsWith("\\")
    ) {
      const err = new Error("PATH_OUTSIDE_BOUNDARY");
      err.code = "PATH_OUTSIDE_BOUNDARY";
      throw err;
    }
  }
  const baseResolved = path.resolve(baseDir);
  const targetResolved = path.resolve(baseResolved, ...segments);
  const rel = path.relative(baseResolved, targetResolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("PATH_OUTSIDE_BOUNDARY");
    err.code = "PATH_OUTSIDE_BOUNDARY";
    throw err;
  }
  let cursor = baseResolved;
  for (const part of ["", ...rel.split(path.sep)]) {
    if (part) cursor = path.join(cursor, part);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
      const error = new Error("STATE_LINK_BLOCKED");
      error.code = "STATE_LINK_BLOCKED";
      throw error;
    }
  }
  return targetResolved;
}

