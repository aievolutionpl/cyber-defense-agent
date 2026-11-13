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

/**
 * Official Windows application update sources.
 * Maps Windows Uninstall registry names to vendor download URLs and winget identifiers.
 * Vulnerability evidence comes from a separate advisory lookup.
 */
export const WINDOWS_VENDOR_CATALOG = [
  {
    id: "7-zip",
    match: /^7-Zip\b/i,
    vendor: "Igor Pavlov",
    updateUrl: "https://www.7-zip.org/download.html",
    wingetId: "7zip.7zip",
  },
  {
    id: "winrar",
    match: /^WinRAR\b/i,
    vendor: "win.rar GmbH",
    updateUrl: "https://www.win-rar.com/download.html",
    wingetId: "RARLab.WinRAR",
  },
  {
    id: "git-for-windows",
    match: /^Git(?:\s+version|\b)/i,
    vendor: "The Git Development Community",
    updateUrl: "https://git-scm.com/download/win",
    wingetId: "Git.Git",
  },
  {
    id: "google-chrome",
    match: /^Google Chrome\b/i,
    vendor: "Google LLC",
    updateUrl: "https://www.google.com/chrome/",
    wingetId: "Google.Chrome",
  },
  {
    id: "microsoft-edge",
    match: /^Microsoft Edge\b(?!.*WebView2)/i,
    vendor: "Microsoft Corporation",
    updateUrl: "https://www.microsoft.com/edge/download",
    wingetId: "Microsoft.Edge",
  },
  {
    id: "mozilla-firefox",
    match: /^Mozilla Firefox\b/i,
    vendor: "Mozilla",
    updateUrl: "https://www.mozilla.org/firefox/new/",
    wingetId: "Mozilla.Firefox",
  },
  {
    id: "vlc",
    match: /^VLC media player\b/i,
    vendor: "VideoLAN",
    updateUrl: "https://www.videolan.org/vlc/download-windows.html",
    wingetId: "VideoLAN.VLC",
  },
  {
    id: "putty",
    match: /^PuTTY\b/i,
    vendor: "Simon Tatham",
    updateUrl: "https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html",
    wingetId: "PuTTY.PuTTY",
  },
  {
    id: "notepad-plus-plus",
    match: /^Notepad\+\+/i,
    vendor: "Notepad++ Team",
    updateUrl: "https://notepad-plus-plus.org/downloads/",
    wingetId: "Notepad++.Notepad++",
  },
  {
    id: "nodejs",
    match: /^Node\.js\b/i,
    vendor: "Node.js Foundation",
    updateUrl: "https://nodejs.org/en/download",
    wingetId: "OpenJS.NodeJS.LTS",
  },
  {
    id: "wireshark",
    match: /^Wireshark\b/i,
    vendor: "Wireshark Foundation",
    updateUrl: "https://www.wireshark.org/download.html",
    wingetId: "WiresharkFoundation.Wireshark",
  },
  {
    id: "vscode",
    match: /^Microsoft Visual Studio Code\b/i,
    vendor: "Microsoft Corporation",
    updateUrl: "https://code.visualstudio.com/Download",
    wingetId: "Microsoft.VisualStudioCode",
  },
  {
    id: "python",
    match: /^Python 3\.\d+/i,
    vendor: "Python Software Foundation",
    updateUrl: "https://www.python.org/downloads/windows/",
    wingetId: "Python.Python.3.12",
  },
  {
    id: "docker-desktop",
    match: /^Docker Desktop\b/i,
    vendor: "Docker Inc.",
    updateUrl: "https://www.docker.com/products/docker-desktop/",
    wingetId: "Docker.DockerDesktop",
  },
  {
    id: "keepassxc",
    match: /^KeePassXC\b/i,
    vendor: "KeePassXC Team",
    updateUrl: "https://keepassxc.org/download/",
    wingetId: "KeePassXCTeam.KeePassXC",
  },
  {
    id: "filezilla",
    match: /^FileZilla(?: Client)?\b/i,
    vendor: "Tim Kosse",
    updateUrl: "https://filezilla-project.org/download.php?type=client",
    wingetId: "TimKosse.FileZilla.Client",
  },
];

/** Compare two dotted version strings numerically. Returns -1, 0, 1, or null when unparseable. */
export function compareVersions(installed, target) {
  const extract = (v) => {
    if (typeof v !== "string" || !v || v === "unknown") return null;
    const match = /(\d+(?:\.\d+)+)/.exec(v.trim()) || /^v?(\d+)$/.exec(v.trim());
    if (!match) return null;
    return match[1].split(".").map((n) => Number.parseInt(n, 10));
  };
  const a = extract(installed);
  const b = extract(target);
  if (!a || !b) return null;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/** Match an installed Windows or desktop package against the curated vendor security catalog. */
export function matchWindowsVendorCatalog(pkg) {
  const rule = (!pkg?.source || pkg.source === "windows-registry")
    ? WINDOWS_VENDOR_CATALOG.find((entry) => entry.match.test(clean(pkg?.name))) : null;
  return {
    matched: Boolean(rule),
    catalogId: rule?.id ?? null,
    vendor: clean(pkg?.vendor, 80) || rule?.vendor || null,
    status: "manual_lookup",
    updateUrl: rule?.updateUrl ?? null,
    wingetId: rule?.wingetId ?? null,
    fixedIn: null,
    advisoryId: null,
  };
}

function normalize(entries, source, ecosystem) {
  const out = [];
  for (const entry of entries) {
    const name = clean(entry?.name);
    const version = clean(entry?.version, 80);
    if (!name || !version) continue;
    const pkg = {
      name,
      version,
      source,
      ecosystem,
      ...(entry.vendor ? { vendor: clean(entry.vendor, 80) } : {}),
      ...(ecosystem && entry.lookupName ? { lookupName: clean(entry.lookupName), lookupVersion: clean(entry.lookupVersion, 80) || version } : {}),
    };
    if (!ecosystem) {
      const vc = matchWindowsVendorCatalog(pkg);
      if (vc.matched) {
        pkg.vendorCatalog = {
          id: vc.catalogId,
          status: vc.status,
          fixedIn: vc.fixedIn,
          advisoryId: vc.advisoryId,
          severity: vc.severity,
          cvss: vc.cvss,
          knownExploited: vc.knownExploited,
          updateUrl: vc.updateUrl,
          wingetId: vc.wingetId,
        };
      }
    }
    out.push(pkg);
  }
  return out;
}

export function summarizeInventoryVerification(packages = []) {
  return {
    total: packages.length,
    automaticallyCheckable: packages.filter((pkg) => pkg.ecosystem).length,
    officialUpdateSources: packages.filter((pkg) => matchWindowsVendorCatalog(pkg).matched).length,
    verifiedTotal: 0,
    verifiedOsv: 0,
    verifiedVendorCatalog: 0,
    updateRequiredCount: 0,
    needsManualCheck: packages.filter((pkg) => !pkg.ecosystem).length,
  };
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
  const verification = summarizeInventoryVerification(packages);
  return {
    format: "cda.inventory.v1",
    kind: "host",
    observedAt: new Date(now).toISOString(),
    host: { platform, os: release, arch: process.arch },
    sources,
    total: packages.length,
    verification,
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
  const packages = report.packages ?? [];
  const verification = summarizeInventoryVerification(packages);
  const vendorRows = packages.flatMap((pkg) => {
    const vendor = matchWindowsVendorCatalog(pkg);
    return vendor.matched ? [`| ${markdown(pkg.name)} | ${markdown(pkg.version)} | Requires vendor verification | ${markdown(vendor.updateUrl)} | ${markdown(vendor.wingetId)} |`] : [];
  });
  const packageRows = packages.slice(0, 1500).map((pkg) =>
    `| ${markdown(pkg.name)} | ${markdown(pkg.version)} | ${markdown(pkg.source)} | ${pkg.ecosystem ? markdown(pkg.ecosystem) : "manual lookup"} |`,
  );
  const listeners = report.listeners?.ports ?? [];
  const listenerSection = report.kind !== "host" ? "" : report.listeners?.status !== "ok"
    ? "## Listening TCP ports\n\nPort inventory unavailable.\n\n"
    : `## Listening TCP ports\n\n| Port | Exposure | Typical service |\n|---|---|---|\n${listeners.map((port) => `| ${port.port} | ${port.exposure} | ${port.note ?? "—"} |`).join("\n")}\n\n`;
  return `# Cyber Defense Agent — ${report.kind === "host" ? "machine" : "project dependency"} inventory

Observed ${report.observedAt}.

${report.host ? `System ${markdown(report.host.os.id)} ${markdown(report.host.os.version)} (${report.host.platform}/${report.host.arch}). Hostname and user names are not recorded.\n\n` : ""}Packages ${report.total}${report.truncated ? " (truncated)" : ""}. Automatically checkable against OSV.dev ${verification.automaticallyCheckable}. Needs vendor/NVD lookup ${verification.needsManualCheck}. Official update sources available for ${verification.officialUpdateSources} applications.

## Collection sources

${report.sources.map((item) => `- ${markdown(item.id)} — ${item.status} (${item.count})`).join("\n")}

${listenerSection}${vendorRows.length ? `## Windows vendor update sources\n\n| Application | Installed | Status | Official update source | Winget identifier |\n|---|---|---|---|---|\n${vendorRows.join("\n")}\n\n` : ""}## Packages

| Name | Version | Source | OSV ecosystem |
|---|---|---|---|
${packageRows.join("\n")}
${packages.length > 1500 ? `\n…and ${packages.length - 1500} more in the JSON report.\n` : ""}
## Limits

${report.limitations.map((limit) => `- ${limit}`).join("\n")}
`;
}
