import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { StateStore, scopeDigest } from "./scope.mjs";
import { ROOT, resolveContainedPath } from "./local-paths.mjs";
import { projectFor } from "./projects.mjs";

const activeWorkflowChildren = new Map();

function saveRunState(run, rootDir = ROOT) {
  run.updatedAt = new Date().toISOString();
  new StateStore(rootDir).write("runs", run.runId, run);
  return run;
}

export function getGuidedAudit(runId, rootDir = ROOT) {
  const run = new StateStore(rootDir).read("runs", runId);
  if (run.status === "running" && run.ownerPid && run.ownerPid !== process.pid) {
    try { process.kill(run.ownerPid, 0); }
    catch (error) {
      if (error.code === "ESRCH") {
        run.status = "failed";
        run.error = "REVIEW_INTERRUPTED";
      }
    }
  }
  return run;
}

export function listGuidedAudits(rootDir = ROOT, limit = 25) {
  const dir = resolveContainedPath(rootDir, ".cda", "runs");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^[a-zA-Z0-9_-]{1,64}\.json$/.test(name))
    .flatMap((name) => {
      try { return [getGuidedAudit(name.slice(0, -5), rootDir)]; }
      catch { return []; }
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, limit);
}

function buildWorkflowDefinition(workflow, runId, params = {}) {
  const pl = params.lang !== "en";
  const cda = path.join(ROOT, "tools", "cda.mjs");
  const demo = path.join(ROOT, "tools", "demo.mjs");
  const langArg = pl ? "pl" : "en";

  if (workflow === "pc") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const includeAdvisories = params.sharePackageNames === true || params.planAdvisories === true;
    const invName = `${runId}-inventory`;
    const advName = `${runId}-advisories`;
    const repName = `${runId}-report`;
    return {
      title: includeAdvisories
        ? (pl ? "Audyt komputera i znanych podatności" : "Computer inventory and vulnerability lookup")
        : (pl ? "Lokalna inwentaryzacja komputera" : "Local computer inventory"),
      steps: [
        {
          id: "inventory",
          label: pl ? "1. Inwentaryzacja programów i otwartych portów TCP" : "1. Software & TCP port inventory",
          script: cda,
          args: ["inventory", "--name", invName, "--yes"],
          reportName: `${invName}.json`,
        },
        ...(includeAdvisories ? [{
          id: "advisories",
          requiresApproval: "package_names",
          label: pl ? "2. Weryfikacja luk (OSV.dev, CISA KEV i Katalog Windows)" : "2. Vulnerability check (OSV.dev, CISA KEV & Windows Catalog)",
          script: cda,
          args: ["advisories", "--inventory", invName, "--name", advName, "--share-package-names"],
          reportName: `${advName}.json`,
        }] : []),
        {
          id: "report",
          label: pl ? "Generowanie raportu wizualnego HTML" : "Generate visual HTML report",
          script: cda,
          args: ["report", "--name", repName, "--from", invName, ...(includeAdvisories ? ["--from", advName] : []), "--lang", langArg],
          reportName: `${repName}.html`,
        },
      ],
    };
  }

  if (workflow === "project") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const targetRoot = params.target ? path.resolve(String(params.target)) : ROOT;
    if (!fs.existsSync(targetRoot)) throw new Error("INVALID_TARGET_PATH");
    if (!Array.isArray(params.files) || !params.files.length || params.files.length > 100 || params.files.some((file) => typeof file !== "string")) {
      throw new Error("EXPLICIT_FILES_REQUIRED");
    }
    const files = [...new Set(params.files)];
    const scopeName = `${runId}-scope`;
    const revName = `${runId}-review`;
    const depsName = `${runId}-deps`;
    const repName = `${runId}-report`;
    const allowArgs = files.flatMap((f) => ["--allow", f]);
    const hasLockfile = files.includes("package-lock.json");

    const steps = [
      {
        id: "scope",
        label: pl ? `1. Propozycja zakresu (${files.length} plików)` : `1. Propose file scope (${files.length} files)`,
        script: cda,
        args: ["scope", "--root", targetRoot, ...allowArgs, "--name", scopeName],
        reportName: null,
      },
      {
        id: "approve",
        requiresApproval: "scope",
        label: pl ? "2. Zatwierdzenie zakresu tylko do odczytu (24h)" : "2. Approve read-only scope (24h)",
        script: cda,
        args: ["approve", "--scope", scopeName, "--root", targetRoot, "--yes"],
        reportName: null,
      },
      {
        id: "review",
        label: pl ? "3. Skanowanie regułami statycznymi v0.2" : "3. Static security rules scan v0.2",
        script: cda,
        args: ["review", "--scope", scopeName, "--name", revName],
        reportName: `${revName}.json`,
      },
    ];
    if (hasLockfile) {
      steps.push({
        id: "deps",
        label: pl ? "4. Inwentaryzacja zależności z package-lock.json" : "4. Dependency lockfile inventory",
        script: cda,
        args: ["deps", "--scope", scopeName, "--input", "package-lock.json", "--name", depsName],
        reportName: `${depsName}.json`,
      });
    }
    steps.push({
      id: "report",
      label: pl ? `${hasLockfile ? "5" : "4"}. Generowanie raportu wizualnego HTML` : `${hasLockfile ? "5" : "4"}. Visual HTML report generation`,
      script: cda,
      args: [
        "report",
        "--name",
        repName,
        "--from",
        revName,
        ...(hasLockfile ? ["--from", depsName] : []),
        "--lang",
        langArg,
      ],
      reportName: `${repName}.html`,
    });
    return {
      title: pl ? "Prowadzony Audyt Projektu i Kodu" : "Guided Project & Code Audit",
      steps,
    };
  }

  if (workflow === "web") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const url = String(params.target || params.url || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("INVALID_URL");
    const webName = `${runId}-web`;
    const repName = `${runId}-report`;
    return {
      title: pl ? `Pasywny Audyt Strony WWW (${url})` : `Passive Website Audit (${url})`,
      steps: [
        {
          id: "web",
          label: pl ? "1. Pasywna kontrola HTTPS, HSTS, CSP, Cookies, CORS i TLS" : "1. Passive HTTPS, HSTS, CSP, Cookies, CORS & TLS check",
          script: cda,
          args: ["web", "--url", url, "--name", webName, "--authorized"],
          reportName: `${webName}.json`,
        },
        {
          id: "report",
          label: pl ? "2. Generowanie raportu wizualnego HTML i Dashboardu" : "2. Visual HTML report & Dashboard generation",
          script: cda,
          args: ["report", "--name", repName, "--from", webName, "--lang", langArg],
          reportName: `${repName}.html`,
        },
      ],
    };
  }

  if (workflow === "demo") {
    return {
      title: pl ? "Scenariusz Demo: Wykrycie → Blokada → Poprawka → Retest" : "Demo Walkthrough: Finding → Block → Fix → Retest",
      steps: [
        {
          id: "demo",
          label: pl ? "1. Syntetyczny projekt, wykrycie luki lodash i retest" : "1. Synthetic project, lodash finding and retest",
          script: demo,
          args: ["--prefix", runId, "--lang", langArg],
          reportName: `${runId}-report.html`,
        },
        {
          id: "report-after",
          label: pl ? "Raport po poprawce demonstracyjnej" : "Report after the demonstration fix",
          script: cda,
          args: ["report", "--name", `${runId}-after-report`, "--from", `${runId}-before`, "--from", `${runId}-after`, "--from", `${runId}-retest`, "--lang", langArg, "--title", pl ? "Demo: wynik po poprawce" : "Demo: result after the fix"],
          reportName: `${runId}-after-report.html`,
        },
        {
          id: "dashboard",
          label: pl ? "2. Odświeżenie wspólnego panelu dashboard.html" : "2. Refresh shared dashboard.html",
          script: cda,
          args: ["dashboard", "--lang", langArg],
          reportName: "dashboard.html",
        },
      ],
    };
  }

  throw new Error("UNSUPPORTED_WORKFLOW");
}

function computeNextStepRecommendation(run) {
  const pl = run.lang !== "en";
  if (run.status === "cancelled") {
    return pl
      ? "Audyt został wstrzymany przez operatora. Kliknij „Wznów audyt”, aby dokończyć od przerwanego kroku."
      : "Audit was paused by the operator. Click 'Resume audit' to continue from the interrupted step.";
  }
  if (run.status === "failed") {
    return pl
      ? `Krok zakończył się błędem (${run.error || "sprawdź logi"}). Po rozwiązaniu przyczyny kliknij „Wznów audyt”.`
      : `A step failed (${run.error || "check logs"}). Fix the cause and click 'Resume audit'.`;
  }
  if (run.status === "awaiting_approval") {
    return pl ? "Sprawdź szczegóły kolejnego kroku i zatwierdź jego wykonanie." : "Review the next step and approve it to continue.";
  }
  if (run.status === "running") {
    return pl ? "Trwa wykonywanie kroków audytu..." : "Executing guided audit steps...";
  }
  const counts = run.findingsSummary?.counts || { P0: 0, P1: 0, P2: 0, P3: 0 };
  if (counts.P0 > 0 || counts.P1 > 0) {
    return pl
      ? `Wykryto pilne ustalenia (P0: ${counts.P0}, P1: ${counts.P1}). Otwórz wygenerowany raport HTML, wdróż poprawki, a następnie uruchom retest lub przekaż raport do Claude/Codex.`
      : `High-priority findings detected (P0: ${counts.P0}, P1: ${counts.P1}). Open the HTML report, apply fixes, then run a retest or pass the report to Claude/Codex.`;
  }
  return pl
    ? "Audyt zakończony. Przejrzyj raport HTML oraz sekcję pokrycia (programy wymagające sprawdzenia u producenta)."
    : "Audit completed. Review the HTML report and coverage limits (packages needing vendor verification).";
}

async function executeWorkflowSteps(run, { rootDir = ROOT, stepRunner = null } = {}) {
  const defaultRunner = (step, runId) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [step.script, ...step.args], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const key = new StateStore(rootDir).file("runs", runId);
    activeWorkflowChildren.set(key, child);
    let stdout = "";
    let stderr = "";
    let failure = null;
    const timer = setTimeout(() => {
      failure = new Error("STEP_TIMEOUT");
      child.kill("SIGTERM");
    }, 300_000);
    const collect = (chunk, isError) => {
      if (failure) return;
      if (isError) stderr += String(chunk); else stdout += String(chunk);
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 2 * 1024 * 1024) {
        failure = new Error("STEP_OUTPUT_TOO_LARGE");
        child.kill("SIGTERM");
      }
    };
    child.stdout?.on("data", (chunk) => collect(chunk, false));
    child.stderr?.on("data", (chunk) => collect(chunk, true));
    child.on("error", (error) => {
      clearTimeout(timer);
      activeWorkflowChildren.delete(key);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      activeWorkflowChildren.delete(key);
      if (failure) return reject(failure);
      if (signal) return reject(new Error("WORKFLOW_CANCELLED"));
      if (code !== 0) return reject(new Error((stderr || stdout || `Step ${step.id} exited with code ${code}`).trim()));
      resolve(stdout.trim());
    });
  });
  const runner = stepRunner || defaultRunner;

  for (const step of run.steps) {
    const fresh = getGuidedAudit(run.runId, rootDir);
    if (fresh.status === "cancelled") {
      run.status = "cancelled";
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }
    if (step.status === "completed") continue;
    if (step.requiresApproval && !run.approvals?.[step.requiresApproval]) {
      run.status = "awaiting_approval";
      run.pendingApproval = {
        kind: step.requiresApproval,
        token: crypto.randomBytes(16).toString("hex"),
        ...(step.requiresApproval === "scope" ? { root: run.scopeProposal.root, files: run.scopeProposal.files } : {}),
      };
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }

    step.status = "running";
    step.startedAt = new Date().toISOString();
    step.error = null;
    saveRunState(run, rootDir);

    try {
      const output = await runner(step, run.runId);
      const afterCheck = getGuidedAudit(run.runId, rootDir);
      if (afterCheck.status === "cancelled") {
        step.status = "cancelled";
        step.finishedAt = new Date().toISOString();
        run.status = "cancelled";
        run.nextStep = computeNextStepRecommendation(run);
        saveRunState(run, rootDir);
        return run;
      }
      step.output = String(output || "").slice(0, 4000);
      if (step.id === "scope") {
        const scope = JSON.parse(String(output).split("\nAwaiting explicit approval.")[0]);
        if (scope.approved !== false || !Array.isArray(scope.files) || typeof scope.root !== "string") {
          throw new Error("INVALID_SCOPE_PROPOSAL");
        }
        run.scopeProposal = scope;
        const approvalStep = run.steps.find((item) => item.id === "approve");
        approvalStep.args.push("--proposal", scopeDigest(scope));
      }
      step.status = "completed";
      step.finishedAt = new Date().toISOString();
      if (step.reportName && !run.reports.includes(step.reportName)) {
        run.reports.push(step.reportName);
      }
      try {
        const parsed = JSON.parse(String(output || "").split(/\r?\n/).at(-1) || "{}");
        if (parsed.counts) {
          run.findingsSummary = {
            verdict: parsed.verdict || "routine",
            counts: parsed.counts,
            checked: parsed.checked,
            notChecked: parsed.notChecked,
          };
        }
      } catch {
        /* non-JSON step output */
      }
      saveRunState(run, rootDir);
    } catch (err) {
      const current = getGuidedAudit(run.runId, rootDir);
      if (current.status === "cancelled" || err.code === "WORKFLOW_CANCELLED") {
        step.status = "cancelled";
        step.finishedAt = new Date().toISOString();
        run.status = "cancelled";
        run.nextStep = computeNextStepRecommendation(run);
        saveRunState(run, rootDir);
        return run;
      }
      step.status = "failed";
      step.finishedAt = new Date().toISOString();
      step.error = err.message || "STEP_FAILED";
      run.status = "failed";
      run.error = step.error;
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }
  }

  run.status = "completed";
  run.error = null;
  run.finishedAt = new Date().toISOString();
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  return run;
}

/**
 * Start a guided multi-step audit workflow ("pc", "project", "web", or "demo").
 * Runs asynchronously in the background (or awaits completion when awaitCompletion=true for tests).
 */
export function startGuidedAudit(
  params = {},
  { rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {},
) {
  const workflow = String(params.workflow || "demo").toLowerCase();
  const lang = params.lang === "en" ? "en" : "pl";
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const runId = `run-${workflow}-${stamp}-${crypto.randomBytes(6).toString("hex")}`;
  const def = buildWorkflowDefinition(workflow, runId, { ...params, lang });

  let thread = null;
  if (params.sessionId) {
    const session = new StateStore(rootDir).read("sessions", params.sessionId);
    if (!session.chat || session.sessionId !== params.sessionId || (session.projectId || null) !== (params.projectId || null)) throw new Error("INVALID_SESSION");
    thread = session.conversationId || session.sessionId;
  }
  const run = {
    projectId: projectFor(rootDir, params.projectId)?.id || null,
    conversationId: thread,
    ownerPid: process.pid,
    runId,
    workflow,
    title: def.title,
    target: String(params.target || params.url || "").slice(0, 200),
    lang,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    approvals: { package_names: params.sharePackageNames === true },
    pendingApproval: null,
    steps: def.steps.map((s) => ({
      ...s,
      id: s.id,
      label: s.label,
      script: s.script,
      args: s.args,
      reportName: s.reportName,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      output: "",
      error: null,
    })),
    reports: [],
    findingsSummary: null,
    nextStep: computeNextStepRecommendation({ status: "running", lang }),
  };

  saveRunState(run, rootDir);
  return runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion });
}

const activeWorkflowRuns = new Map();

function runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion }) {
  const key = new StateStore(rootDir).file("runs", run.runId);
  const completion = Promise.resolve()
    .then(() => executeWorkflowSteps(run, { rootDir, stepRunner }))
    .catch((error) => {
      run.status = "failed";
      run.error = error.message;
      run.nextStep = computeNextStepRecommendation(run);
      return saveRunState(run, rootDir);
    })
    .finally(() => activeWorkflowRuns.delete(key));
  activeWorkflowRuns.set(key, completion);
  return awaitCompletion ? completion : Promise.resolve(run);
}

/** Cancel is idempotent and retains the active child until its close event. */
export function cancelGuidedAudit(runId, { rootDir = ROOT } = {}) {
  const run = getGuidedAudit(runId, rootDir);
  if (["completed", "cancelled"].includes(run.status)) return run;
  run.status = "cancelled";
  run.cancelledAt = new Date().toISOString();
  for (const step of run.steps) {
    if (step.status === "running") {
      step.status = "cancelled";
      step.finishedAt = new Date().toISOString();
    }
  }
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  const key = new StateStore(rootDir).file("runs", run.runId);
  activeWorkflowChildren.get(key)?.kill("SIGTERM");
  return run;
}

/** Resume waits for a cancelled child to close, so two attempts cannot overlap. */
export async function resumeGuidedAudit(runId, { rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {}) {
  const key = new StateStore(rootDir).file("runs", runId);
  const active = activeWorkflowRuns.get(key);
  if (active) {
    const current = getGuidedAudit(runId, rootDir);
    if (current.status === "running") return awaitCompletion ? active : current;
    await active;
    const resumed = activeWorkflowRuns.get(key);
    if (resumed) return awaitCompletion ? resumed : getGuidedAudit(runId, rootDir);
  }
  const run = getGuidedAudit(runId, rootDir);
  if (run.status === "completed") return run;
  if (run.status === "awaiting_approval" && run.pendingApproval) return run;
  if (!run.approvals) {
    run.approvals = {};
    for (const step of run.steps) {
      if (run.workflow === "pc" && step.id === "advisories") step.requiresApproval = "package_names";
      if (run.workflow === "project" && ["scope", "approve"].includes(step.id)) {
        step.status = "pending";
        if (step.id === "approve") step.requiresApproval = "scope";
      }
    }
  }
  if (run.status === "running" && run.ownerPid && run.ownerPid !== process.pid) throw new Error("REVIEW_IN_PROGRESS");
  run.ownerPid = process.pid;
  run.status = "running";
  run.error = null;
  run.finishedAt = null;
  for (const step of run.steps) {
    if (["failed", "cancelled", "running"].includes(step.status)) {
      step.status = "pending";
      step.error = null;
      step.startedAt = null;
      step.finishedAt = null;
      step.output = "";
    }
  }
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  return runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion });
}

/** Approve only the displayed step and its current proposal token. */
export async function approveGuidedAudit(runId, { approvalToken, rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {}) {
  const run = getGuidedAudit(runId, rootDir);
  if (run.status !== "awaiting_approval" || !run.pendingApproval || run.pendingApproval.token !== approvalToken) {
    throw new Error("APPROVAL_REQUIRED");
  }
  run.approvals ||= {};
  run.approvals[run.pendingApproval.kind] = true;
  run.pendingApproval = null;
  saveRunState(run, rootDir);
  return resumeGuidedAudit(runId, { rootDir, stepRunner, awaitCompletion });
}

/** Execute a bounded, allowlisted local tool action from the Mini UI or TUI. */
