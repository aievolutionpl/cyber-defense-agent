import { authorized, deny } from './scope.mjs';
import { RULES, validateReport } from './engine.mjs';

const severities = ['critical', 'high', 'medium', 'low', 'info'];
const priorities = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3', info: 'P3' };

/** Bounded, data-only envelope. No provider calls, raw evidence, paths or commands. */
export function modelSummary(scope, report) {
  authorized(scope);
  validateReport(report, scope);
  if (!['local-review', 'import'].includes(report.source)) deny('INVALID_REPORT_SOURCE');
  const ordered = [...report.findings].sort((a, b) => severities.indexOf(a.severity) - severities.indexOf(b.severity));
  const files = new Map(scope.files.map((file, index) => [file, `file_${String(index + 1).padStart(3, '0')}`]));
  const rules = new Map();
  return {
    format: 'cda.model-input.v1', trust: 'untrusted-observations', source: report.source,
    policy: { mode: 'advisory-only', targetExecution: false, network: false, contentSharingRequiresReview: true },
    total: ordered.length, included: Math.min(ordered.length, 100), omitted: Math.max(0, ordered.length - 100),
    findings: ordered.slice(0, 100).map((f, i) => {
      if (!rules.has(f.ruleId)) rules.set(f.ruleId, `rule_${String(rules.size + 1).padStart(3, '0')}`);
      return { ref: `finding_${String(i + 1).padStart(3, '0')}`, fileRef: files.get(f.path), line: f.line,
        rule: RULES.includes(f.ruleId) ? f.ruleId : 'external', ruleRef: rules.get(f.ruleId),
        severity: f.severity, priority: priorities[f.severity], confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'low' };
    }),
    limitations: ['No exploitability claim.', 'Opaque references require the local original report for context.', 'No automatic provider routing or action execution.'],
  };
}
