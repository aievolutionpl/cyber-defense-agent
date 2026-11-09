/** Single repository URL used by every GitHub button, command and README link. */
export const REPOSITORY = 'https://github.com/aievolutionpl/cyber-defense-agent';
export const BRANCH = 'codex/node-v0.1';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
export const github = (anchor = '') => anchor ? `${REPOSITORY}${anchor.replace('/blob/main/', `/blob/${BRANCH}/`)}` : `${REPOSITORY}/tree/${BRANCH}`;
export const cloneCommand = `git clone --branch ${BRANCH} ${REPOSITORY}.git\ncd cyber-defense-agent`;
