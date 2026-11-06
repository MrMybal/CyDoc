/** Shared API for account-based services and account-free loopback workspaces. */
export class StudioClient {
  constructor(base, token = '', { fetch: transport = globalThis.fetch } = {}) {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTP(S) Studio origin without credentials.');
    if (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Remote Studio connections require HTTPS.');
    if (!token && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('An SDK token is required for remote Studio connections.');
    this.base = url.origin; this.token = token; this.fetch = transport;
  }
  headers() { return this.token ? { Authorization: `Bearer ${this.token}` } : {}; }
  async request(path, method = 'GET', value) {
    const response = await this.fetch(`${this.base}/api/${path}`, { method, headers: { ...this.headers(), 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value) });
    const result = await response.json(); if (!response.ok) { const error = new Error(result.error || `HTTP ${response.status}`); error.status = response.status; throw error; } return result;
  }
  projects() { return this.request('projects'); }
  createProject(input) { return this.request('projects', 'POST', input); }
  project(id) { return this.request(`projects/${encodeURIComponent(id)}`); }
  page(project, locale, id) { return this.request(this.pagePath(project, locale, id)); }
  createPage(project, input) { return this.request(`projects/${encodeURIComponent(project)}/pages`, 'POST', input); }
  updatePage(project, locale, id, body, revisionToken) { return this.request(this.pagePath(project, locale, id), 'PUT', { body, revisionToken }); }
  updateMetadata(project, locale, id, metadata) { return this.request(this.pagePath(project, locale, id), 'PATCH', metadata); }
  archivePage(project, locale, id) { return this.request(this.pagePath(project, locale, id), 'DELETE', {}); }
  settings(project, input) { return this.request(`projects/${encodeURIComponent(project)}/settings`, 'PATCH', input); }
  assets(project) { return this.request(`projects/${encodeURIComponent(project)}/assets`); }
  async importAsset(project, filename, bytes) {
    const response = await this.fetch(`${this.base}/api/projects/${encodeURIComponent(project)}/assets?name=${encodeURIComponent(filename)}`, { method: 'POST', headers: this.headers(), body: bytes });
    const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
  }
  publish(project) { return this.request(`projects/${encodeURIComponent(project)}/publish`, 'POST', {}); }
  preview(project, locale, page) { return this.request(`projects/${encodeURIComponent(project)}/preview?${new URLSearchParams({locale,page})}`); }
  history(project,locale,page) { return this.request(`projects/${[project,'history',locale,page].map(encodeURIComponent).join('/')}`); }
  restore(project,locale,page,input) { return this.request(`projects/${[project,'history',locale,page].map(encodeURIComponent).join('/')}`,'POST',input); }
  members(project) { return this.request(`projects/${encodeURIComponent(project)}/members`); }
  invite(project,email,role) { return this.request(`projects/${encodeURIComponent(project)}/members`,'POST',{email,role}); }
  removeMember(project,userId) { return this.request(`projects/${encodeURIComponent(project)}/members`,'DELETE',{userId}); }
  reload(project,locale,pageId) { return this.request(`projects/${encodeURIComponent(project)}/reload`,'POST',{locale,pageId}); }
  async download(project) { const response=await this.fetch(`${this.base}/api/projects/${encodeURIComponent(project)}/download`,{headers:this.headers()});if(!response.ok)throw new Error((await response.json()).error);return new Uint8Array(await response.arrayBuffer()); }
  gitStatus(project) { return this.request(`projects/${encodeURIComponent(project)}/git`); }
  git(project, action, parameters = {}) { return this.request(`projects/${encodeURIComponent(project)}/git/${encodeURIComponent(action)}`, 'POST', parameters); }
  pagePath(project, locale, id) { return `projects/${[project, 'pages', locale, id].map(encodeURIComponent).join('/')}`; }
}
