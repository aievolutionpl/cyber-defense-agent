/** Single repository URL used by every GitHub button, command and README link. */
export const REPOSITORY = 'https://github.com/aievolutionpl/cyber-defense-agent';
export const BRANCH = 'codex/node-v0.1';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const asset = (path: string) => `${BASE_PATH}${path}`;
export type Locale = 'en' | 'pl';
export const github = (anchor = '') => anchor ? `${REPOSITORY}${anchor.replace('/blob/main/', `/blob/${BRANCH}/`)}` : `${REPOSITORY}/tree/${BRANCH}`;
export const cloneCommand = `git clone --branch ${BRANCH} ${REPOSITORY}.git\ncd cyber-defense-agent`;
