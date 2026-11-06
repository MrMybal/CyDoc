import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fail, text } from './storage.mjs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
const execute = promisify(execFile);

export async function git(root, args, timeout = 60000, authentication) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_ASKPASS:'',SSH_ASKPASS:'',GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
  for(const key of Object.keys(env))if(/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/.test(key)||['GIT_DIR','GIT_COMMON_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_NAMESPACE'].includes(key))delete env[key];
  if (authentication) {
    const url = new URL(authentication.url);
    env.GIT_CONFIG_COUNT = '1'; env.GIT_CONFIG_KEY_0 = `http.${url.origin}${url.pathname}.extraHeader`;
    env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${Buffer.from(`${authentication.username}:${authentication.token}`).toString('base64')}`;
  }
  try {
    return (await execute('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-c', 'credential.helper=', '-c','core.askPass=','-c', 'http.followRedirects=false', '-c', 'protocol.ext.allow=never', ...args], {
      cwd: root, timeout, maxBuffer: 4 * 1024 * 1024,
      env, windowsHide: true
    })).stdout;
  } catch (error) {
    if (error.code === 'ENOENT') fail(503, 'Git is not installed. Editing without Git remains available.');
    // Git errors can contain credentials in a remote URL. Never relay stderr.
    fail(409, `Git ${args[0]} failed. Check repository state and host credentials.`);
  }
}
export async function gitStatus(project) {
  if (!project.git) return { enabled: false, branch: '', changes: [], remotes: [] };
  const branch = (await git(project.root, ['symbolic-ref', '--short', 'HEAD']).catch(() => 'HEAD')).trim();
  const raw = await git(project.root, ['status', '--porcelain=v1', '-z', '--', '.CyDocBuild', 'Documentation']);
  const entries = raw.split('\0').filter(Boolean), changes = [];
  for (let i = 0; i < entries.length; i++) {
    const status = entries[i].slice(0, 2), file = entries[i].slice(3);
    changes.push({ status, file }); if (/[RC]/.test(status)) i++;
  }
  const remotes = (await git(project.root, ['remote'])).trim().split('\n').filter(Boolean);
  const branches=(await git(project.root,['branch','--format=%(refname:short)'])).trim().split('\n').filter(Boolean);
  return { enabled: true, branch, changes, remotes, branches };
}
export function remoteUrl(value, hosts = ['github.com','gitlab.com','bitbucket.org']) {
  text(value, 2000);
  // The operator provisions Git credentials; no credentials/paths/options from page content.
  let url; try { url = new URL(value); } catch { fail(400, 'Use an HTTPS repository URL without embedded credentials.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/i.test(url.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)) fail(400, 'Use a public HTTPS repository host without credentials.');
  if (!hosts.includes(url.hostname)) fail(400, 'This Git host has not been allowed by the server operator.');
  return url.href;
}
export async function gitAction(project, action, input = {}, credentials) {
  if (action === 'enable') { await git(project.root, ['init']); return { enabled: true }; }
  if (!project.git) fail(400, 'Git is disabled for this project.');
  if(action==='history')return {history:await git(project.root,['log','-30','--format=%h %ad %s','--date=short','--','.CyDocBuild/manual','.CyDocBuild/assets','.CyDocBuild/cydoc.config.json','Documentation'])};
  if(['branch','switch'].includes(action)){
    const branch=text(input.branch,120);if(!/^[a-zA-Z0-9][\w./-]*$/.test(branch)||branch.includes('..')||branch.endsWith('.lock'))fail(400,'Invalid branch name.');
    await git(project.root,['check-ref-format','--branch',branch]);
    await git(project.root,action==='branch'?['switch','-c',branch]:['switch','--',branch]);return {branch};
  }
  if (action === 'diff') return { diff: await git(project.root, ['diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--', '.CyDocBuild/manual', '.CyDocBuild/assets', '.CyDocBuild/cydoc.config.json', 'Documentation']) };
  if (action === 'commit') {
    const message = text(input.message, 2000).trim(); if (!message) fail(400, 'A commit message is required.');
    const name = text(input.name, 120).trim(), mail = text(input.email, 254).trim();
    if (!name || /[\r\n<>]/.test(name) || !/^[^\s<>@]+@[^\s<>@]+$/.test(mail)) fail(400, 'Provide a valid commit author.');
    // Explicit paths avoid credentials, internal state and unrelated application changes.
    const paths=['.CyDocBuild/cydoc.config.json','.CyDocBuild/manual','.CyDocBuild/assets'];
    if(await stat(join(project.root,'.CyDocBuild/.gitignore')).catch(()=>null))paths.push('.CyDocBuild/.gitignore');
    for(const path of ['Documentation/Documentation.html','Documentation/DocAI.md','Documentation/DocData'])if(await stat(join(project.root,path)).catch(()=>null))paths.push(path);
    await git(project.root, ['add', '--', ...paths]);
    const staged = await git(project.root, ['diff', '--cached', '--name-only', '-z']);
    if (staged.split('\0').filter(Boolean).some(file => !/^(?:\.CyDocBuild\/(?:cydoc\.config\.json$|\.gitignore$|manual\/|assets\/)|Documentation\/(?:Documentation\.html$|DocAI\.md$|DocData\/))/.test(file))) fail(409, 'Other application files are staged. Commit those separately before committing the manual.');
    await git(project.root, ['-c', `user.name=${name}`, '-c', `user.email=${mail}`, 'commit', '-m', message]);
    return { commit: (await git(project.root, ['rev-parse', 'HEAD'])).trim() };
  }
  if (action === 'remote') { await git(project.root, ['remote', 'add', 'origin', remoteUrl(input.url)]); return { remote: 'origin' }; }
  if (['fetch', 'pull', 'push'].includes(action)) {
    const remote = input.remote || 'origin';
    if (!/^[a-zA-Z0-9][\w.-]{0,63}$/.test(remote)) fail(400, 'Invalid remote name.');
    const url = remoteUrl((await git(project.root, ['remote', 'get-url', remote])).trim());
    const stored = credentials && await credentials.get(project.id);
    // --ff-only keeps an explicit conflict resolution step; no reset/force/automatic merge.
    const args = action === 'pull' ? ['pull', '--ff-only', remote] : [action, remote];
    await git(project.root, args, 120000, stored ? { ...stored, url } : undefined); return { completed: action };
  }
  fail(400, 'Unknown Git action.');
}
