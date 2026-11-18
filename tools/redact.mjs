/** Defense in depth. Imported free text is not included in reports at all. */
export function redact(value, maxLength = 1600) {
  return String(value)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/-----BEGIN [^-]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*?-----END [^-]+-----/g, '[REDACTED KEY]')
    .replace(/-----BEGIN [^-]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*$/g, '[REDACTED KEY]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{12,})\b/g, '[REDACTED TOKEN]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED JWT]')
    .replace(/\b(Bearer|Basic)\s+\S+/gi, '$1 [REDACTED]')
    .replace(/((?:password|passwd|secret|token|api[_-]?key|authorization|credential)\s*["']?\s*[:=]\s*)["']?[^\s,"'\r\n;}]+["']?/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .slice(0, maxLength);
}

export function markdown(value) {
  return redact(value).replace(/[<>`\[\]\\|*_#]/g, c => `\\${c}`).replace(/[\r\n]+/g, ' ');
}
