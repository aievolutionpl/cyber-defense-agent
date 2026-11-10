import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { authorized, deny } from "./scope.mjs";
import { markdown } from "./redact.mjs";

export const MAX_PACKAGES = 6000;
const clean = (value, max = 160) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max)
    : "";

/** Fixed, argument-only, read-only OS queries. No shell, no user-supplied strings. */
const defaultRun = (command, args) =>
  execFileSync(command, args, {
    encoding: "utf8",
    shell: false,
    timeout: 90_000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  });

const WINDOWS_QUERY =
  "$ErrorActionPreference='SilentlyContinue';" +
  "$k='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'," +
  "'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'," +
  "'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*';" +
  "Get-ItemProperty $k | Where-Object { $_.DisplayName } | " +
  "Select-Object DisplayName,DisplayVersion,Publisher | ConvertTo-Json -Compress";

/** Each collector: a fixed command plus a pure parser of its text output. */
export const COLLECTORS = {
  linux: [
    {
      id: "dpkg",
      command: "dpkg-query",
      args: ["-W", "-f=${binary:Package}\\t${Version}\\t${source:Package}\\t${source:Version}\\n"],
      parse: (text) =>
        text.split("\n").map((line) => {
          const [name, version, source, sourceVersion] = line.split("\t");
          return { name: name?.replace(/:.*$/, ""), version, lookupName: source, lookupVersion: sourceVersion };
        }),
    },
    {
      id: "rpm",
      command: "rpm",
      args: ["-qa", "--qf", "%{NAME}\\t%{EPOCHNUM}:%{VERSION}-%{RELEASE}\\n"],
      parse: (text) =>
        text.split("\n").map((line) => {
          const [name, version] = line.split("\t");
          return { name, version: version?.replace(/^0:/, "") };
        }),
    },
    {
      id: "apk",
      command: "apk",
      args: ["list", "--installed"],
      parse: (text) =>
        text.split("\n").map((line) => {
          const match = /^(.+)-(\d[^\s-]*-r\d+)\s/.exec(line);
          return match ? { name: match[1], version: match[2] } : null;
        }),
    },
    {
      id: "flatpak",
      command: "flatpak",
      args: ["list", "--app", "--columns=application,version"],
      parse: (text) =>
        text.split("\n").map((line) => {
          const [name, version] = line.split("\t");
          return { name, version: version || "unknown" };
        }),
    },
    {
      id: "snap",
      command: "snap",
      args: ["list"],
      parse: (text) =>
        text.split("\n").slice(1).map((line) => {
          const [name, version] = line.trim().split(/\s+/);
          return { name, version };
        }),
    },
  ],
  darwin: [
    {
      id: "macos-apps",
      command: "system_profiler",
      args: ["SPApplicationsDataType", "-json"],
      parse: (text) =>
        (JSON.parse(text).SPApplicationsDataType ?? []).map((app) => ({
          name: app._name,
          version: app.version || "unknown",
          vendor: app.obtained_from,
        })),
    },
    {
      id: "brew",
      command: "brew",
      args: ["list", "--versions"],
      parse: (text) =>
        text.split("\n").map((line) => {
          const parts = line.trim().split(/\s+/);
          return { name: parts[0], version: parts.at(-1) };
        }),
    },
  ],
  win32: [
    {
      id: "windows-registry",
      command: "powershell.exe",
      args: ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_QUERY],
      parse: (text) => {
        const data = JSON.parse(text || "[]");
        return (Array.isArray(data) ? data : [data]).map((app) => ({
          name: app.DisplayName,
          version: app.DisplayVersion || "unknown",
          vendor: app.Publisher,
        }));
      },
    },
  ],
};

const LISTENERS = {
  linux: [{ command: "ss", args: ["-H", "-tln"] }, { command: "netstat", args: ["-tln"] }],
  darwin: [{ command: "netstat", args: ["-an", "-p", "tcp"] }],
  win32: [{ command: "netstat.exe", args: ["-an", "-p", "TCP"] }],
};

/** Ports that deserve a question when reachable from the network. Not a verdict. */
export const SENSITIVE_PORTS = {
  21: "FTP (cleartext)", 23: "Telnet (cleartext)", 135: "Windows RPC", 139: "NetBIOS", 445: "SMB file sharing",
  1433: "Microsoft SQL Server", 2375: "Docker API without TLS", 3306: "MySQL/MariaDB", 3389: "Remote Desktop",
  5432: "PostgreSQL", 5900: "VNC", 5984: "CouchDB", 6379: "Redis", 9200: "Elasticsearch", 11211: "Memcached", 27017: "MongoDB",
};

export function parseListeners(text) {
  const seen = new Map();
  for (const line of String(text).split("\n")) {
    if (!/LISTEN/i.test(line)) continue;
    const match = line.trim().split(/\s+/).map((token) => /^(.*[.:*\]])[:.]?(\d{1,5})$/.exec(token) ?? /^(\*)[:.](\d{1,5})$/.exec(token)).find(Boolean);
    if (!match) continue;
    const address = match[1].replace(/[:.]$/, "").replace(/^\[|\]$/g, "").replace(/%.*$/, "");
    const port = Number(match[2]);
    if (!(port > 0 && port < 65536)) continue;
    const loopback = /^(127\.|::1$|localhost$)/.test(address);
    const key = `${port}:${loopback}`;
    if (!seen.has(key))
      seen.set(key, { port, exposure: loopback ? "loopback-only" : "network-reachable", note: SENSITIVE_PORTS[port] ?? null });
  }
  return [...seen.values()].sort((a, b) => a.port - b.port);
}

export function osRelease(text) {
  const map = {};
  for (const line of String(text).split("\n")) {
    const match = /^([A-Z_]+)=("?)(.*)\2$/.exec(line.trim());
    if (match) map[match[1]] = clean(match[3], 60);
  }
  return { id: (map.ID ?? "linux").toLowerCase(), version: map.VERSION_ID ?? "unknown", codename: map.VERSION_CODENAME ?? null };
}

/** OSV ecosystem label for a distribution package source, or null when no trustworthy mapping exists. */
export function distroEcosystem(source, release) {
  const major = /^\d+/.exec(release.version)?.[0];
  if (source === "dpkg" && release.id === "debian" && major) return `Debian:${major}`;
  if (source === "dpkg" && release.id === "ubuntu" && /^\d\d\.\d\d$/.test(release.version)) {
    const [year, month] = release.version.split(".").map(Number);
    return `Ubuntu:${release.version}${year % 2 === 0 && month === 4 ? ":LTS" : ""}`;
  }
  if (source === "apk" && release.id === "alpine" && /^\d+\.\d+/.test(release.version)) return `Alpine:v${/^\d+\.\d+/.exec(release.version)[0]}`;
  if (source === "rpm" && release.id === "rocky" && major) return `Rocky Linux:${major}`;
  if (source === "rpm" && release.id === "almalinux" && major) return `AlmaLinux:${major}`;
  return null;
}

function normalize(entries, source, ecosystem) {
  const out = [];
  for (const entry of entries) {
    const name = clean(entry?.name);
    const version = clean(entry?.version, 80);
    if (!name || !version) continue;
    out.push({
      name,
      version,
      source,
      ecosystem,
      ...(entry.vendor ? { vendor: clean(entry.vendor, 80) } : {}),
      ...(ecosystem && entry.lookupName ? { lookupName: clean(entry.lookupName), lookupVersion: clean(entry.lookupVersion, 80) || version } : {}),
    });
  }
  return out;
}

/**
 * Inventory of THIS machine: installed software and listening TCP ports.
 * Requires explicit consent. Never records hostname, user names, paths or process names.
 */
export function collectInventory({ consent, platform = process.platform, run = defaultRun, readFile = (file) => fs.readFileSync(file, "utf8"), now = Date.now() } = {}) {
  if (consent !== true) deny("EXPLICIT_APPROVAL_REQUIRED");
  if (!Object.hasOwn(COLLECTORS, platform)) deny("UNSUPPORTED_PLATFORM");
  let release = { id: platform === "win32" ? "windows" : platform === "darwin" ? "macos" : "linux", version: clean(os.release(), 60), codename: null };
  if (platform === "linux") {
    try { release = osRelease(readFile("/etc/os-release")); } catch { /* keep kernel release */ }
  } else if (platform === "darwin") {
    try { release.version = clean(run("sw_vers", ["-productVersion"]), 40); } catch { /* keep kernel release */ }
  }
  const sources = [];
  const packages = [];
  const seen = new Set();
  for (const collector of COLLECTORS[platform]) {
    try {
      const ecosystem = distroEcosystem(collector.id, release);
      const entries = normalize(collector.parse(run(collector.command, collector.args)).filter(Boolean), collector.id, ecosystem);
      let count = 0;
      for (const entry of entries) {
        const key = `${entry.source}\u0000${entry.name.toLowerCase()}\u0000${entry.version}`;
        if (seen.has(key) || packages.length >= MAX_PACKAGES) continue;
        seen.add(key);
        packages.push(entry);
        count += 1;
      }
      sources.push({ id: collector.id, status: "ok", count });
    } catch (error) {
      sources.push({ id: collector.id, status: error?.code === "ENOENT" ? "not_installed" : "error", count: 0 });
    }
  }
  let listeners = [];
  let listenerStatus = "unavailable";
  for (const candidate of LISTENERS[platform]) {
    try {
      listeners = parseListeners(run(candidate.command, candidate.args));
      listenerStatus = "ok";
      break;
    } catch { /* try the next fixed command */ }
  }
  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return {
    format: "cda.inventory.v1",
    kind: "host",
    observedAt: new Date(now).toISOString(),
    host: { platform, os: release, arch: process.arch },
    sources,
    total: packages.length,
    truncated: packages.length >= MAX_PACKAGES,
    packages,
    listeners: { status: listenerStatus, ports: listeners },
    policy: { localMachineOnly: true, readOnlyQueries: true, network: false, installation: false, hostnameRecorded: false },
    limitations: [
      "Lists what the package managers and the OS application registry report. Portable apps, browser extensions, firmware and manually copied binaries are not covered.",
      "A listening port is a question to answer, not a finding of compromise. Reachability also depends on the firewall and the router.",
      "An inventory describes one moment. Collect a fresh one after changes.",
    ],
  };
}

const lastSegment = (key) => key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
const LOCKFILES = [
  [/^(?:package-lock|npm-shrinkwrap)\.json$/, "npm", (text) => {
    const data = JSON.parse(text);
    const out = [];
    if (data.packages && typeof data.packages === "object")
      for (const [key, value] of Object.entries(data.packages))
        if (key.includes("node_modules/") && value && typeof value.version === "string" && !value.link) out.push({ name: lastSegment(key), version: value.version });
    const walk = (deps, depth) => {
      if (!deps || typeof deps !== "object" || depth > 40) return;
      for (const [name, value] of Object.entries(deps)) {
        if (value && typeof value.version === "string") out.push({ name, version: value.version });
        walk(value?.dependencies, depth + 1);
      }
    };
    if (!data.packages) walk(data.dependencies, 0);
    return out;
  }],
  [/^requirements[\w.-]*\.txt$/, "PyPI", (text) =>
    text.split("\n").map((line) => {
      const match = /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*==\s*([A-Za-z0-9][A-Za-z0-9.!+_-]*)/.exec(line);
      return match ? { name: match[1].toLowerCase().replace(/[._]+/g, "-"), version: match[2] } : null;
    })],
  [/^(?:poetry|uv)\.lock$/, "PyPI", (text) => tomlPackages(text)],
  [/^Cargo\.lock$/, "crates.io", (text) => tomlPackages(text)],
  [/^go\.sum$/, "Go", (text) =>
    text.split("\n").map((line) => {
      const match = /^(\S+)\s+v([^\s/]+)(?:\/go\.mod)?\s/.exec(line);
      return match ? { name: match[1], version: match[2].replace(/\+incompatible$/, "") } : null;
    })],
  [/^composer\.lock$/, "Packagist", (text) => {
    const data = JSON.parse(text);
    return [...(data.packages ?? []), ...(data["packages-dev"] ?? [])].map((p) => ({ name: p?.name, version: String(p?.version ?? "").replace(/^v/, "") }));
  }],
  [/^Gemfile\.lock$/, "RubyGems", (text) =>
    text.split("\n").map((line) => {
      const match = /^ {4}([A-Za-z0-9][\w.-]*) \(([^)\s]+)\)$/.exec(line);
      return match ? { name: match[1], version: match[2] } : null;
    })],
];

function tomlPackages(text) {
  const out = [];
  for (const block of text.split(/^\[\[package\]\]\s*$/m).slice(1)) {
    const name = /^name\s*=\s*"([^"]+)"/m.exec(block)?.[1];
    const version = /^version\s*=\s*"([^"]+)"/m.exec(block)?.[1];
    if (name && version) out.push({ name, version });
  }
  return out;
}

export const SUPPORTED_LOCKFILES = "package-lock.json, npm-shrinkwrap.json, requirements*.txt (pinned ==), poetry.lock, uv.lock, Cargo.lock, go.sum, composer.lock, Gemfile.lock";

/** Dependency inventory from one approved lockfile. Parsed as data; nothing is installed or executed. */
export function depsInventory(scope, file, now = Date.now()) {
  const text = authorized(scope).read(file);
  const base = path.posix.basename(file.replaceAll("\\", "/"));
  const match = LOCKFILES.find(([pattern]) => pattern.test(base));
  if (!match) deny("UNSUPPORTED_LOCKFILE");
  let entries;
  try {
    entries = match[2](text).filter(Boolean);
  } catch {
    deny("INVALID_LOCKFILE");
  }
  const seen = new Set();
  const packages = [];
  for (const entry of normalize(entries, base, match[1])) {
    const key = `${entry.name}\u0000${entry.version}`;
    if (seen.has(key) || packages.length >= MAX_PACKAGES) continue;
    seen.add(key);
    packages.push(entry);
  }
  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return {
    format: "cda.inventory.v1",
    kind: "project",
    observedAt: new Date(now).toISOString(),
    host: null,
    sources: [{ id: base, status: "ok", count: packages.length }],
    total: packages.length,
    truncated: packages.length >= MAX_PACKAGES,
    packages,
    listeners: { status: "not_applicable", ports: [] },
    policy: { localMachineOnly: true, readOnlyQueries: true, network: false, installation: false, hostnameRecorded: false },
    limitations: [
      "Covers exactly one approved lockfile. Unpinned ranges, vendored code and other manifests are not included.",
      "A lockfile shows what would be installed, not what is deployed or reachable at runtime.",
    ],
  };
}

export function renderInventory(report) {
  const exposed = report.listeners.ports.filter((p) => p.exposure === "network-reachable");
  const lookup = report.packages.filter((p) => p.ecosystem).length;
  return `# Cyber Defense Agent — ${report.kind === "host" ? "machine" : "project dependency"} inventory\n\nObserved: ${report.observedAt}\n\n${report.host ? `System: ${markdown(report.host.os.id)} ${markdown(report.host.os.version)} (${report.host.platform}/${report.host.arch}). Hostname and user names are not recorded.\n\n` : ""}Sources: ${report.sources.map((s) => `${markdown(s.id)} — ${s.status} (${s.count})`).join("; ")}\n\nPackages: ${report.total}${report.truncated ? " (truncated)" : ""}. Automatically checkable against OSV.dev: ${lookup}. Needs vendor/NVD lookup: ${report.total - lookup}.\n\n${report.kind === "host" ? `## Listening TCP ports\n\n${report.listeners.status !== "ok" ? "Not available on this system.\n" : exposed.length ? `| Port | Exposure | Typical service |\n|---|---|---|\n${report.listeners.ports.map((p) => `| ${p.port} | ${p.exposure} | ${p.note ?? "—"} |`).join("\n")}\n` : "No network-reachable listener reported. Loopback-only services: " + report.listeners.ports.length + ".\n"}\n` : ""}## Packages\n\n| Name | Version | Source | OSV ecosystem |\n|---|---|---|---|\n${report.packages.slice(0, 1500).map((p) => `| ${markdown(p.name)} | ${markdown(p.version)} | ${markdown(p.source)} | ${p.ecosystem ? markdown(p.ecosystem) : "manual lookup"} |`).join("\n")}\n${report.packages.length > 1500 ? `\n…and ${report.packages.length - 1500} more in the JSON report.\n` : ""}\n## Limits\n\n${report.limitations.map((s) => `- ${s}`).join("\n")}\n`;
}
