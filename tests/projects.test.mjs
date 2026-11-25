import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createProject, listProjects, setArchived } from '../tools/projects.mjs';
import { StateStore } from '../tools/scope.mjs';
import { launchAgentSession, getAgentSessions, dashboardSessions } from '../tools/agent-sessions.mjs';
import { getGuidedAudit } from '../tools/guided-reviews.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-workspace-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('a local review link survives reload without disclosing the project name to Codex', t => {
  const rootDir = fixture(t);
  const store = new StateStore(rootDir);
  const project = createProject(rootDir, 'Internal project label');
  const other = createProject(rootDir, 'Other project');
  assert.equal(listProjects(rootDir).length, 2);
  const run = { runId: 'run-demo-sample', projectId: project.id, status: 'completed' };
  store.write('runs', run.runId, run);
  const options = { rootDir, agentsMap: { codex: { installed: false } } };
  const input = { host: 'codex', message: 'Explain scope', consent: true, reviewId: run.runId };
  assert.throws(() => launchAgentSession({ ...input, projectId: other.id }, options), /INVALID_REVIEW/);
  const { session } = launchAgentSession({ ...input, projectId: project.id }, options);
  assert.equal(session.reviewId, run.runId);
  assert.equal(session.projectId, project.id);
  assert.ok(!session.prompt.includes(project.name) && !session.prompt.includes(run.runId));
  assert.equal(dashboardSessions(rootDir)[0].conversation, undefined);
  assert.equal(dashboardSessions(rootDir, session.sessionId)[0].conversation[0].text, input.message);
  setArchived(rootDir, { sessionId: session.sessionId, archived: true });
  assert.equal(getAgentSessions(rootDir)[0].archived, true);
  setArchived(rootDir, { sessionId: session.sessionId, archived: false });
  assert.equal(getAgentSessions(rootDir)[0].archived, false);
});

test('an interrupted review is recoverable without starting work while reading its status', t => {
  const root = fixture(t);
  const store = new StateStore(root);
  const run = { runId: 'run-demo-interrupted', ownerPid: 2147483647, status: 'running', steps: [] };
  store.write('runs', run.runId, run);
  assert.equal(getGuidedAudit(run.runId, root).error, 'REVIEW_INTERRUPTED');
  assert.deepEqual(store.read('runs', run.runId), run);
});
