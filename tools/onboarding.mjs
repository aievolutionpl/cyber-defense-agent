import path from 'node:path';
import { authorized } from './scope.mjs';

/** Port of AntyGravity's onboarding: metadata only, using the stricter Node scope. */
export function onboarding(scope) {
  authorized(scope);
  const files = scope.files;
  const technologies = new Set();
  for (const file of files) {
    const base = path.posix.basename(file);
    if (base === 'package.json') technologies.add('Node.js');
    if (/\.tsx?$/.test(base) || base === 'tsconfig.json') technologies.add('TypeScript');
    if (/^(?:requirements.*\.txt|pyproject\.toml|Pipfile)$/.test(base)) technologies.add('Python');
    if (/^(?:Dockerfile(?:\..*)?|(?:docker-)?compose\.ya?ml)$/.test(base)) technologies.add('Docker');
  }
  return {
    format: 'cda.onboarding.v1', scope: { files: files.length, expiresAt: scope.expiresAt, mode: scope.mode },
    technologies: [...technologies].sort(), detection: 'approved-filenames-only',
    questions: [
      { id: 'goal', text: 'What are we protecting?', options: ['Local files', 'Existing JSON/SARIF', 'Lab planning guidance'] },
      { id: 'priority', text: 'What matters most?', options: ['Before-release review', 'Risk prioritisation', 'Retest'] },
      { id: 'sharing', text: 'What reviewed summary may be shared with your model provider?', options: ['No report content', 'Locally reviewed, redacted findings only'] },
    ],
    limitations: ['No target content read by onboarding.', 'Technology hints come only from user-approved filenames.', 'No active web/API/network tests or automatic remediation.'],
  };
}
