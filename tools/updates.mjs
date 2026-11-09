import { authorized, deny, sha } from "./scope.mjs";
import { markdown } from "./redact.mjs";

const managers = {
  windows: ["winget", "windows-update"],
  linux: ["apt", "dnf", "zypper"],
  macos: ["softwareupdate", "brew"],
};
const safeLabel = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._+():~ /-]{0,119}$/.test(value);
const ageLimit = 7 * 24 * 3600_000;

/** Offline triage of an operator-supplied inventory. No OS commands or remote queries. */
export function reviewUpdates(scope, file, now = Date.now()) {
  const text = authorized(scope).read(file);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    deny("INVALID_UPDATE_INVENTORY");
  }
  if (
    !data ||
    data.format !== "cda.updates.v1" ||
    !Object.hasOwn(managers, data.platform) ||
    !managers[data.platform].includes(data.manager) ||
    !Array.isArray(data.packages) ||
    data.packages.length > 1000
  )
    deny("INVALID_UPDATE_INVENTORY");
  const observed =
    typeof data.observedAt === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(data.observedAt)
      ? Date.parse(data.observedAt)
      : NaN;
  if (!Number.isFinite(observed) || new Date(observed).toISOString().slice(0, 19) !== data.observedAt.slice(0, 19) || observed > now + 300_000)
    deny("INVALID_INVENTORY_TIME");
  const stale = now - observed > ageLimit;
  const names = new Set();
  const packages = data.packages.map((item) => {
    if (
      !item ||
      !safeLabel(item.name) ||
      !safeLabel(item.installed) ||
      !(item.available === null || safeLabel(item.available)) ||
      !["security", "regular", "unknown"].includes(item.classification) ||
      !["yes", "no", "unknown"].includes(item.restart)
    )
      deny("INVALID_UPDATE_PACKAGE");
    const identity = item.name.toLowerCase();
    if (names.has(identity)) deny("DUPLICATE_UPDATE_PACKAGE");
    names.add(identity);
    const status = stale
      ? "stale_inventory"
      : item.available === null
        ? "insufficient_data"
        : item.available === item.installed
          ? "reported_current"
          : "update_reported";
    return {
      name: item.name,
      installed: item.installed,
      available: item.available,
      classification: item.classification,
      restart: item.restart,
      status,
      priority:
        status !== "update_reported"
          ? null
          : item.classification === "security"
            ? "P1"
            : "P2",
      confidence: "operator-supplied, not independently verified",
    };
  });
  packages.sort(
    (a, b) =>
      (a.priority ?? "P9").localeCompare(b.priority ?? "P9") ||
      a.name.localeCompare(b.name),
  );
  return {
    format: "cda.update-plan.v1",
    observedAt: data.observedAt,
    createdAt: new Date(now).toISOString(),
    platform: data.platform,
    manager: data.manager,
    source: { file, digest: sha(text), trust: "untrusted-operator-inventory" },
    stale,
    total: packages.length,
    updatesReported: packages.filter((p) => p.status === "update_reported")
      .length,
    packages,
    policy: {
      targetExecution: false,
      network: false,
      installation: false,
      providerCalled: false,
    },
    steps: [
      "Confirm the inventory against your OS or vendor update catalog. Different version strings alone do not establish ordering or vulnerability.",
      "Check compatibility, release notes and support status; test the change on a non-production system.",
      "Verify a restorable backup, rollback procedure, maintenance window and an explicit administrator approval.",
      "An administrator applies the approved update in the normal management tool. This agent does not install it.",
      "Collect a fresh inventory and validate service health, logs and restart requirements. Do not call the machine fully patched from one list.",
    ],
    limitations: [
      "This is an offline plan, not a live computer or server scan.",
      "Classification and available versions come from the supplied inventory and may be wrong or incomplete.",
      "Inventories older than seven days are stale. Missing data is not evidence that a system is up to date.",
      "No package URLs, free-text messages, scripts or commands from the input are copied or executed.",
    ],
  };
}

export function renderUpdatePlan(report) {
  return `# Cyber Defense Agent — update plan\n\nPlatform: ${report.platform} / ${report.manager}\n\nInventory observed: ${report.observedAt}\n\nFreshness: ${report.stale ? "STALE — refresh before deciding" : "within seven days; completeness not verified"}\n\nReported updates: ${report.updatesReported} / ${report.total} listed packages\n\n| Package | Installed | Reported available | State | Priority | Restart |\n|---|---|---|---|---|---|\n${report.packages.map((p) => `| ${markdown(p.name)} | ${markdown(p.installed)} | ${p.available === null ? "unknown" : markdown(p.available)} | ${p.status} | ${p.priority ?? "—"} | ${p.restart} |`).join("\n")}\n\n## Before any update\n\n${report.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Evidence and limits\n\nSource: ${markdown(report.source.file)}; SHA-256: ${report.source.digest}.\n\nConfidence: operator-supplied; not independently verified. Security classifications are not verified vulnerability findings.\n\n${report.limitations.map((s) => `- ${s}`).join("\n")}\n`;
}
