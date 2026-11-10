import tls from "node:tls";
import { deny } from "./scope.mjs";
import { markdown } from "./redact.mjs";

const MAX_HOPS = 5;
const AGENT = "cyber-defense-agent/0.2 (passive security-header check; operator-authorized)";
const PROBE_ORIGIN = "https://cda-origin-check.invalid";
const short = (value, max = 120) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export function parseTarget(value) {
  let url;
  try { url = new URL(value); } catch { deny("INVALID_URL"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname) deny("INVALID_URL");
  url.hash = "";
  return url;
}

function defaultTlsProbe(host, port) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port, servername: /^[\d.:]+$/.test(host) ? undefined : host, rejectUnauthorized: false, timeout: 15_000 }, () => {
      const cert = socket.getPeerCertificate();
      resolve({ protocol: socket.getProtocol(), authorized: socket.authorized, error: socket.authorizationError ? String(socket.authorizationError) : null, validTo: cert?.valid_to ?? null, issuer: cert?.issuer?.O ?? cert?.issuer?.CN ?? null });
      socket.end();
    });
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => { socket.destroy(); resolve(null); });
  });
}

async function get(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(20_000), headers: { "user-agent": AGENT, accept: "text/html,*/*;q=0.5", ...headers } });
  try { await response.body?.cancel(); } catch { /* headers are all we need */ }
  return response;
}

/**
 * Passive posture check of ONE web origin the operator owns or is authorized to assess.
 * A handful of ordinary GET requests, like a browser visit: no crawling, payloads, logins or port scans.
 */
export async function checkWebsite(target, { consent, fetchImpl = globalThis.fetch, tlsProbe = defaultTlsProbe, now = Date.now() } = {}) {
  if (consent !== true) deny("EXPLICIT_AUTHORIZATION_REQUIRED");
  const start = parseTarget(target);
  const findings = [];
  const passed = [];
  const skipped = [];
  const add = (id, severity, title, evidence, fix) => findings.push({ id, severity, priority: { high: "P1", medium: "P2", low: "P3", info: "P3" }[severity], title, evidence: short(evidence, 200), fix });
  let requests = 0;

  const chain = [];
  let url = start;
  let response;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    try { response = await get(fetchImpl, url, { origin: PROBE_ORIGIN }); requests += 1; } catch { deny("TARGET_UNREACHABLE"); }
    chain.push({ url: `${url.origin}${url.pathname}`, status: response.status });
    const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
    if (!location) break;
    if (hop === MAX_HOPS) deny("TOO_MANY_REDIRECTS");
    const next = new URL(location, url);
    if (!["https:", "http:"].includes(next.protocol)) break;
    url = next;
  }
  const final = url;
  const h = (name) => response.headers.get(name);
  const https = final.protocol === "https:";

  if (!https) add("WEB-HTTPS-001", "high", "The page is served without HTTPS.", `Final URL scheme: ${final.protocol}`, "Serve the site over HTTPS only and redirect HTTP to HTTPS.");
  else passed.push("Final page is served over HTTPS.");

  if (https && final.port === "") {
    try {
      const plain = await get(fetchImpl, new URL(`http://${final.host}/`));
      requests += 1;
      const location = plain.headers.get("location");
      if (plain.status >= 300 && plain.status < 400 && location && new URL(location, `http://${final.host}/`).protocol === "https:") passed.push("Plain HTTP redirects to HTTPS.");
      else add("WEB-HTTPS-002", "medium", "Plain HTTP does not redirect to HTTPS.", `http://${final.host}/ answered ${plain.status}`, "Redirect every HTTP request to HTTPS (301/308).");
    } catch { skipped.push("HTTP-to-HTTPS redirect: port 80 not reachable (often fine)."); }
  }

  if (https) {
    const hsts = h("strict-transport-security");
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? "")?.[1] ?? 0);
    if (!hsts) add("WEB-HSTS-001", "medium", "No HSTS header: browsers may be downgraded to HTTP.", "Strict-Transport-Security is absent.", "Send Strict-Transport-Security: max-age=31536000; includeSubDomains once every subdomain supports HTTPS.");
    else if (maxAge < 15552000) add("WEB-HSTS-002", "low", "HSTS lifetime is short.", `max-age=${maxAge}`, "Raise max-age to at least six months (15552000), ideally one year.");
    else passed.push("HSTS is set with a long lifetime.");
  }

  const csp = h("content-security-policy");
  if (!csp) add("WEB-CSP-001", "medium", "No Content-Security-Policy: no browser-side limit on injected scripts.", h("content-security-policy-report-only") ? "Only a report-only policy is present." : "Content-Security-Policy is absent.", "Start with a strict policy (default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self') in report-only mode, then enforce it.");
  else {
    if (/script-src[^;]*'unsafe-inline'/i.test(csp) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/i.test(csp)) add("WEB-CSP-002", "low", "CSP allows inline scripts, which weakens XSS protection.", "script-src contains 'unsafe-inline' without nonces or hashes.", "Move to nonces or hashes and remove 'unsafe-inline'.");
    else if (/'unsafe-eval'/i.test(csp)) add("WEB-CSP-003", "low", "CSP allows eval().", "'unsafe-eval' is present.", "Remove 'unsafe-eval' once the code no longer needs it.");
    else passed.push("Content-Security-Policy is present.");
  }

  if (!/frame-ancestors/i.test(csp ?? "") && !h("x-frame-options")) add("WEB-FRAME-001", "medium", "The page can be embedded in another site (clickjacking).", "Neither frame-ancestors nor X-Frame-Options is set.", "Add frame-ancestors 'self' to the CSP (or X-Frame-Options: SAMEORIGIN).");
  else passed.push("Framing is restricted.");

  if ((h("x-content-type-options") ?? "").toLowerCase() !== "nosniff") add("WEB-NOSNIFF-001", "low", "Browsers may guess content types.", "X-Content-Type-Options: nosniff is absent.", "Send X-Content-Type-Options: nosniff.");
  else passed.push("MIME sniffing is disabled.");

  const referrer = (h("referrer-policy") ?? "").toLowerCase();
  if (!referrer) add("WEB-REFERRER-001", "low", "No Referrer-Policy: full URLs may leak to other sites.", "Referrer-Policy is absent.", "Send Referrer-Policy: strict-origin-when-cross-origin (or stricter).");
  else if (/unsafe-url|no-referrer-when-downgrade/.test(referrer)) add("WEB-REFERRER-002", "low", "Referrer-Policy leaks full URLs.", `Referrer-Policy: ${referrer}`, "Use strict-origin-when-cross-origin or no-referrer.");
  else passed.push("Referrer-Policy is set.");

  if (!h("permissions-policy")) add("WEB-PERMS-001", "info", "No Permissions-Policy: camera, microphone and location are not explicitly limited.", "Permissions-Policy is absent.", "Declare only the browser features the site uses, e.g. camera=(), microphone=(), geolocation=().");

  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  let cookieIssues = 0;
  for (const cookie of cookies.slice(0, 30)) {
    const name = short(cookie.split("=")[0], 40);
    const flags = cookie.toLowerCase();
    const missing = [!/;\s*secure/.test(flags) && https ? "Secure" : null, !/;\s*httponly/.test(flags) ? "HttpOnly" : null, !/;\s*samesite=/.test(flags) ? "SameSite" : null].filter(Boolean);
    if (missing.length) {
      cookieIssues += 1;
      const sensitive = /sess|auth|token|sid|login|jwt/i.test(name);
      add("WEB-COOKIE-001", sensitive ? "medium" : "low", `Cookie "${name}" is missing ${missing.join(", ")}.`, "Cookie value not recorded.", "Set Secure, HttpOnly and SameSite=Lax (or Strict) on session cookies. HttpOnly is optional only for cookies that scripts must read.");
    }
  }
  if (cookies.length && !cookieIssues) passed.push("Cookies carry Secure, HttpOnly and SameSite.");

  for (const name of ["server", "x-powered-by", "x-aspnet-version", "x-generator"]) {
    const value = h(name);
    if (value && (/\d+\.\d+/.test(value) || name !== "server")) add("WEB-DISCLOSURE-001", "low", `The ${name} header reveals software${/\d/.test(value) ? " and version" : ""}.`, `${name}: ${value}`, "Remove or genericise the header. Then confirm the disclosed product is on a supported, patched version.");
  }

  const acao = h("access-control-allow-origin");
  const credentials = (h("access-control-allow-credentials") ?? "").toLowerCase() === "true";
  if (acao === PROBE_ORIGIN && credentials) add("WEB-CORS-001", "high", "CORS reflects any origin with credentials: other sites can read authenticated responses.", "An unknown Origin was echoed back together with Access-Control-Allow-Credentials: true.", "Allow only an explicit list of trusted origins when credentials are enabled.");
  else if (acao === PROBE_ORIGIN) add("WEB-CORS-002", "low", "CORS reflects any origin.", "An unknown Origin was echoed in Access-Control-Allow-Origin.", "Reflect only origins from an allowlist. Review whether any response contains user-specific data.");
  else if (acao === "*" && credentials) add("WEB-CORS-003", "medium", "CORS wildcard is combined with credentials.", "Access-Control-Allow-Origin: * with Allow-Credentials: true.", "Browsers reject this combination; it usually signals a misconfigured policy. Use explicit origins.");

  let tlsInfo = null;
  if (https) {
    tlsInfo = await tlsProbe(final.hostname, Number(final.port || 443));
    if (!tlsInfo) skipped.push("TLS details: handshake probe unavailable.");
    else {
      const days = tlsInfo.validTo ? Math.floor((Date.parse(tlsInfo.validTo) - now) / 86400_000) : null;
      if (tlsInfo.authorized === false) add("WEB-TLS-001", "high", "The TLS certificate is not trusted by this machine.", short(tlsInfo.error ?? "certificate validation failed", 80), "Install a valid certificate chain from a trusted CA and match the hostname.");
      if (days !== null && days < 0) add("WEB-TLS-002", "high", "The TLS certificate has expired.", `Expired ${-days} day(s) ago.`, "Renew the certificate now and automate renewal.");
      else if (days !== null && days < 21) add("WEB-TLS-003", "medium", "The TLS certificate expires soon.", `${days} day(s) left.`, "Renew the certificate and automate renewal (for example ACME).");
      if (/^TLSv1(\.1)?$|^SSLv/.test(tlsInfo.protocol ?? "")) add("WEB-TLS-004", "high", "An obsolete TLS version was negotiated.", `Protocol: ${tlsInfo.protocol}`, "Disable TLS 1.0/1.1; allow TLS 1.2 and 1.3 only.");
      if (!findings.some((f) => f.id.startsWith("WEB-TLS"))) passed.push(`TLS: ${short(tlsInfo.protocol, 12)}, certificate valid${days !== null ? ` for ${days} more day(s)` : ""}.`);
    }
  }

  try {
    const sec = await get(fetchImpl, new URL("/.well-known/security.txt", final.origin));
    requests += 1;
    if (sec.status === 200 && /text\/plain/i.test(sec.headers.get("content-type") ?? "")) passed.push("security.txt is published.");
    else add("WEB-SECTXT-001", "info", "No security.txt: researchers have no clear way to report a problem.", `/.well-known/security.txt answered ${sec.status}`, "Publish /.well-known/security.txt with a contact and expiry (RFC 9116).");
  } catch { skipped.push("security.txt: request failed."); }

  const order = { P1: 0, P2: 1, P3: 2 };
  findings.sort((a, b) => order[a.priority] - order[b.priority] || a.id.localeCompare(b.id));
  return {
    format: "cda.web.v1",
    createdAt: new Date(now).toISOString(),
    target: `${start.origin}${start.pathname}`,
    finalUrl: `${final.origin}${final.pathname}`,
    redirects: chain,
    crossHostRedirect: final.hostname !== start.hostname,
    tls: tlsInfo ? { protocol: short(tlsInfo.protocol, 12), validTo: short(tlsInfo.validTo, 40), issuer: short(tlsInfo.issuer, 60) } : null,
    counts: Object.fromEntries(["P1", "P2", "P3"].map((p) => [p, findings.filter((f) => f.priority === p).length])),
    findings,
    passed,
    skipped,
    policy: { requests, method: "GET only", crawling: false, payloads: false, authentication: false, portScan: false, bodyStored: false },
    limitations: [
      "Passive check of one URL's response headers, cookies flags and TLS handshake. It cannot see logic flaws, injection, broken access control or anything behind a login.",
      "Headers can differ per page and per CDN edge. Re-check key pages such as login and checkout.",
      "A clean result means these specific controls are present, not that the site is secure.",
    ],
  };
}

export function renderWeb(report) {
  return `# Cyber Defense Agent — website posture check\n\nTarget: ${markdown(report.target)}\n\nFinal URL: ${markdown(report.finalUrl)}${report.crossHostRedirect ? " (redirected to a different host — confirm you are authorized for it)" : ""}\n\nChecked: ${report.createdAt}. Requests sent: ${report.policy.requests} (GET only; no crawling, payloads, logins or port scans).\n\n| P1 | P2 | P3 |\n|---|---|---|\n| ${report.counts.P1} | ${report.counts.P2} | ${report.counts.P3} |\n\n## Findings\n\n${report.findings.length ? report.findings.map((f) => `### ${f.priority} · ${f.id} — ${markdown(f.title)}\n\n- Evidence: ${markdown(f.evidence)}\n- Fix: ${markdown(f.fix)}`).join("\n\n") : "No issue found in the checked controls."}\n\n## Controls in place\n\n${report.passed.length ? report.passed.map((s) => `- ${markdown(s)}`).join("\n") : "- None of the checked controls passed."}\n${report.skipped.length ? `\n## Not checked\n\n${report.skipped.map((s) => `- ${markdown(s)}`).join("\n")}\n` : ""}\n## Limits\n\n${report.limitations.map((s) => `- ${s}`).join("\n")}\n`;
}
