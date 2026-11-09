import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_FILES = 160;
export const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export class PolicyError extends Error {
  constructor(code) { super(code); this.name = 'PolicyError'; this.code = code; }
}
export const deny = code => { throw new PolicyError(code); };

export function relativeFile(value) {
  if (typeof value !== 'string' || !value || value.length > 240 || /[\x00-\x1f\x7f<>:"|?*%]/.test(value)) deny('INVALID_PATH');
  const normalized = value.replaceAll('\\', '/');
  if (path.posix.isAbsolute(normalized) || normalized.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) deny('INVALID_PATH');
  return normalized;
}

export function within(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

/** All target reads go through this guard. No globbing, directory walking or execution. */
export class ScopedReader {
  constructor(root, allowed) {
    if (typeof root !== 'string' || !Array.isArray(allowed) || !allowed.length || allowed.length > MAX_FILES) deny('INVALID_SCOPE');
    this.root = fs.realpathSync(root);
    if (!fs.statSync(this.root).isDirectory()) deny('INVALID_ROOT');
    this.allowed = new Set(allowed.map(relativeFile));
  }

  resolve(file) {
    const rel = relativeFile(file);
    if (!this.allowed.has(rel)) deny('FILE_NOT_APPROVED');
    const candidate = path.join(this.root, ...rel.split('/'));
    if (!within(this.root, candidate)) deny('OUT_OF_SCOPE');
    let cursor = this.root;
    for (const part of rel.split('/')) {
      cursor = path.join(cursor, part);
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) deny('LINK_BLOCKED');
    }
    const actual = fs.realpathSync(candidate);
    if (!within(this.root, actual)) deny('OUT_OF_SCOPE');
    return actual;
  }

  read(file) {
    const target = this.resolve(file);
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.nlink > 1) deny('NOT_SINGLE_REGULAR_FILE');
      if (stat.size > MAX_BYTES) deny('FILE_TOO_LARGE');
      const bytes = Buffer.alloc(MAX_BYTES + 1);
      let size = 0;
      while (size <= MAX_BYTES) {
        const count = fs.readSync(fd, bytes, size, bytes.length - size, null);
        if (count === 0) break;
        size += count;
      }
      if (size > MAX_BYTES) deny('FILE_TOO_LARGE');
      const current = fs.statSync(this.resolve(file));
      if (current.dev !== stat.dev || current.ino !== stat.ino || current.size !== stat.size || current.mtimeMs !== stat.mtimeMs) deny('FILE_CHANGED_DURING_READ');
      const result = bytes.subarray(0, size);
      if (result.includes(0)) deny('BINARY_FILE');
      return new TextDecoder('utf-8', { fatal: true }).decode(result);
    } finally { fs.closeSync(fd); }
  }
}

export function propose(root, allowed, now = Date.now()) {
  const reader = new ScopedReader(root, allowed);
  const files = [...reader.allowed].sort();
  // Validate paths and file metadata, without reading file contents before approval.
  for (const file of files) {
    const stat = fs.statSync(reader.resolve(file));
    if (!stat.isFile() || stat.nlink > 1 || stat.size > MAX_BYTES) deny('UNSUPPORTED_FILE');
  }
  return { version: 1, root: reader.root, files, mode: 'local-read-only', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 24 * 3600_000).toISOString(), approved: false };
}

export function scopeDigest(scope) {
  return sha(JSON.stringify([scope.version, scope.root, scope.files, scope.mode, scope.createdAt, scope.expiresAt]));
}

export function approve(scope, root, yes) {
  if (!yes || scope.approved || fs.realpathSync(root) !== scope.root) deny('EXPLICIT_APPROVAL_REQUIRED');
  if (Date.parse(scope.expiresAt) <= Date.now()) deny('SCOPE_EXPIRED');
  return { ...scope, approved: true, approval: scopeDigest(scope) };
}

export function authorized(scope, now = Date.now()) {
  if (scope.version !== 1 || scope.mode !== 'local-read-only' || scope.approved !== true || scope.approval !== scopeDigest(scope)) deny('SCOPE_NOT_APPROVED');
  if (!Number.isFinite(Date.parse(scope.expiresAt)) || Date.parse(scope.expiresAt) <= now) deny('SCOPE_EXPIRED');
  if (fs.realpathSync(scope.root) !== scope.root) deny('ROOT_CHANGED');
  return new ScopedReader(scope.root, scope.files);
}

/** Separate, trusted tool state. Reports cannot choose arbitrary output paths. */
export class StateStore {
  constructor(repoRoot) {
    this.repoRoot = fs.realpathSync(repoRoot);
    this.root = path.join(this.repoRoot, '.cda');
  }
  file(kind, name, ext = 'json', create = false) {
    if (!['scopes', 'reports'].includes(kind) || typeof name !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(name) || !['json', 'md'].includes(ext)) deny('INVALID_STATE_NAME');
    let cursor = this.repoRoot;
    for (const part of ['.cda', kind]) {
      cursor = path.join(cursor, part);
      if (!fs.existsSync(cursor) && create) fs.mkdirSync(cursor, { mode: 0o700 });
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) deny('STATE_LINK_BLOCKED');
    }
    const target = path.join(cursor, `${name}.${ext}`);
    if (fs.existsSync(target)) {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) deny('STATE_LINK_BLOCKED');
    }
    return target;
  }
  read(kind, name) {
    const target = this.file(kind, name);
    const reader = new ScopedReader(path.dirname(target), [path.basename(target)]);
    return JSON.parse(reader.read(path.basename(target)));
  }
  write(kind, name, value, ext = 'json') {
    const target = this.file(kind, name, ext, true);
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    const content = ext === 'json' ? `${JSON.stringify(value, null, 2)}\n` : value;
    if (Buffer.byteLength(content) > MAX_BYTES) deny('REPORT_TOO_LARGE');
    try {
      fs.writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      this.file(kind, name, ext);
      fs.renameSync(temporary, target);
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    return path.relative(this.repoRoot, target).replaceAll('\\', '/');
  }
}
