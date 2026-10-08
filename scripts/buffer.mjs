import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SERVICES = ['linkedin', 'mastodon', 'bluesky'];
const STATE_BRANCH = 'buffer-state';
const STATE_PATH = 'buffer-state.json';
const now = () => new Date().toISOString();

export function validateManifest(manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.posts)) throw new Error('Invalid blog manifest');
  const urls = new Set();
  for (const post of manifest.posts) {
    const url = new URL(post.url);
    if (url.origin !== 'https://svrnm.com' || !post.title || typeof post.text !== 'string' || typeof post.skip !== 'boolean' || urls.has(post.url)) {
      throw new Error('Invalid or duplicate blog manifest entry');
    }
    urls.add(post.url);
  }
  return manifest.posts;
}

export function selectChannels(channels, ids = '') {
  const requested = ids.split(',').map(id => id.trim()).filter(Boolean);
  const selected = requested.length ? channels.filter(channel => requested.includes(channel.id)) : channels;
  if (requested.length && new Set(requested).size !== selected.length) throw new Error('Some configured Buffer channel IDs were not found');
  return SERVICES.map(service => {
    const matches = selected.filter(channel => channel.service.toLowerCase() === service);
    if (matches.length !== 1) throw new Error(`Expected exactly one ${service} channel, found ${matches.length}. Set BUFFER_CHANNEL_IDS to choose channels explicitly.`);
    if (matches[0].isDisconnected || matches[0].isLocked) throw new Error(`${service} channel is disconnected or locked`);
    return matches[0];
  });
}

export function announcement(post) {
  return `${post.text.trim()}\n\n${post.url}`;
}

export class BufferClient {
  constructor(key, fetcher = fetch) { this.key = key; this.fetcher = fetcher; }
  async query(query, variables = {}) {
    const response = await this.fetcher('https://api.buffer.com', {
      method: 'POST', headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Buffer HTTP ${response.status}`);
    const result = await response.json();
    if (result.errors?.length) throw new Error(`Buffer GraphQL: ${result.errors.map(error => error.message).join('; ')}`);
    if (!result.data) throw new Error('Buffer returned no data');
    return result.data;
  }
  async channels(organizationId = '') {
    const { account } = await this.query('query { account { organizations { id name } } }');
    const organizations = account.organizations.filter(org => !organizationId || org.id === organizationId);
    if (!organizations.length) throw new Error('No matching Buffer organization');
    const channels = [];
    for (const org of organizations) {
      const data = await this.query('query Channels($input: ChannelsInput!) { channels(input: $input) { id name service organizationId isDisconnected isLocked } }', { input: { organizationId: org.id } });
      channels.push(...data.channels);
    }
    return channels;
  }
  async create(channel, text, mode) {
    const { createPost } = await this.query(`mutation Create($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id status dueAt } }
        ... on MutationError { message }
      }
    }`, { input: { channelId: channel.id, text, schedulingType: 'automatic', mode: 'addToQueue', saveToDraft: mode === 'draft', needsApproval: false, assets: [] } });
    if (!createPost.post?.id) throw new Error(createPost.message || 'Buffer returned no post receipt');
    return createPost.post;
  }
  async post(id) {
    const data = await this.query('query Post($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink error { message } } }', { input: { id } });
    return data.post;
  }
}

// Durable state lives on its own branch, never in the deployed main branch.
// A contents SHA provides compare-and-swap protection against concurrent edits.
export class GitHubStore {
  constructor(repository, token, fetcher = fetch) {
    this.repository = repository; this.token = token; this.fetcher = fetcher;
  }
  async request(path, method = 'GET', body, allowMissing = false) {
    const response = await this.fetcher(`https://api.github.com/repos/${this.repository}/${path}`, {
      method, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
    return response.json();
  }
  async load() {
    const file = await this.request(`contents/${STATE_PATH}?ref=${STATE_BRANCH}`, 'GET', undefined, true);
    if (!file) {
      // A missing file on an existing branch is corruption, not a new baseline.
      const ref = await this.request(`git/ref/heads/${STATE_BRANCH}`, 'GET', undefined, true);
      if (ref) throw new Error('buffer-state branch exists but its state file is missing');
      return null;
    }
    this.sha = file.sha;
    const state = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    if (state.version !== 1 || !state.posts || !state.channels) throw new Error('Invalid saved Buffer state');
    return state;
  }
  async save(state) {
    const content = `${JSON.stringify(state, null, 2)}\n`;
    if (!this.sha) {
      const tree = await this.request('git/trees', 'POST', { tree: [{ path: STATE_PATH, mode: '100644', type: 'blob', content }] });
      const commit = await this.request('git/commits', 'POST', { message: 'Initialize Buffer blog baseline', tree: tree.sha, parents: [] });
      await this.request('git/refs', 'POST', { ref: `refs/heads/${STATE_BRANCH}`, sha: commit.sha });
      const file = await this.request(`contents/${STATE_PATH}?ref=${STATE_BRANCH}`);
      this.sha = file.sha;
    } else {
      const result = await this.request(`contents/${STATE_PATH}`, 'PUT', {
        message: 'Update Buffer blog receipts', branch: STATE_BRANCH, sha: this.sha, content: Buffer.from(content).toString('base64'),
      });
      this.sha = result.content.sha;
    }
  }
}

export async function submit({ posts, state, channels, mode = 'draft', store, buffer, log = console.log }) {
  if (!['draft', 'queue'].includes(mode)) throw new Error('BUFFER_MODE must be draft or queue');
  if (!state) {
    state = { version: 1, initializedAt: now(), channels, posts: Object.fromEntries(posts.map(post => [post.url, { title: post.title, baseline: true, submissions: {} }])) };
    await store.save(state);
    log(`Initialized baseline for ${posts.length} existing blog posts. No Buffer posts created.`);
    return state;
  }
  // Freeze the initial target channels. Changing targets must be intentional.
  if (JSON.stringify(state.channels.map(c => c.id).sort()) !== JSON.stringify(channels.map(c => c.id).sort())) {
    throw new Error('Buffer channels differ from saved state. Review buffer-state.json before changing targets.');
  }
  const failures = [];
  for (const post of posts) {
    if (state.posts[post.url]?.baseline) continue;
    if (post.skip) {
      if (!state.posts[post.url]) {
        state.posts[post.url] = { title: post.title, skipped: true, submissions: {} };
        await store.save(state);
      }
      continue;
    }
    if (state.posts[post.url]?.skipped) continue;
    const entry = state.posts[post.url] ||= { title: post.title, submissions: {} };
    for (const channel of channels) {
      const previous = entry.submissions[channel.id];
      if (previous) {
        if (!previous.id) failures.push(`Unconfirmed attempt for ${post.url} on ${channel.service}; inspect Buffer and reconcile the receipt before retrying.`);
        continue;
      }
      entry.submissions[channel.id] = { service: channel.service, attemptedAt: now(), mode, status: 'unconfirmed' };
      // Persist BEFORE calling Buffer: if the process dies or the response is lost,
      // reruns stop here instead of silently creating another draft.
      await store.save(state);
      let receipt;
      try {
        receipt = await buffer.create(channel, announcement(post), mode);
      } catch (error) {
        failures.push(`${post.url} on ${channel.service}: ${error.message}. Attempt remains unconfirmed; review Buffer before retrying.`);
        continue;
      }
      Object.assign(entry.submissions[channel.id], receipt, { acceptedAt: now() });
      // If this write fails, stop immediately; the durable unconfirmed attempt
      // protects against duplicates, and the receipt is printed for recovery.
      log(`Buffer receipt: ${channel.service} ${post.url} id=${receipt.id} status=${receipt.status}`);
      await store.save(state);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  log('Blog submissions complete. Existing receipts were preserved.');
  return state;
}

export async function check({ state, store, buffer, log = console.log }) {
  if (!state) { log('No Buffer baseline yet; waiting for a successful deployment.'); return; }
  const failures = [];
  let changed = false;
  for (const [url, entry] of Object.entries(state.posts)) {
    for (const receipt of Object.values(entry.submissions)) {
      if (!receipt.id) {
        failures.push(`Unconfirmed ${receipt.service} attempt for ${url}; inspect Buffer and reconcile the receipt.`);
        continue;
      }
      if (receipt.status === 'sent') continue;
      try {
        const post = await buffer.post(receipt.id);
        Object.assign(receipt, { status: post.status, dueAt: post.dueAt, sentAt: post.sentAt, externalLink: post.externalLink, publishingError: post.error?.message, checkedAt: now() });
        changed = true;
        log(`${receipt.service}: ${post.status} — ${url} — Buffer ID ${receipt.id}${post.externalLink ? ` — ${post.externalLink}` : ''}`);
        if (post.status === 'error') failures.push(`${receipt.service} publication failed for ${url}; resolve Buffer post ${receipt.id} in the dashboard. ${post.error?.message || ''}`);
      } catch (error) {
        failures.push(`Could not check ${receipt.service} post ${receipt.id}: ${error.message}`);
      }
    }
  }
  if (changed) await store.save(state);
  if (failures.length) throw new Error(failures.join('\n'));
}

async function main() {
  const [command, manifestPath] = process.argv.slice(2);
  if (!['submit', 'check'].includes(command)) throw new Error('Usage: node scripts/buffer.mjs submit <manifest> | check');
  for (const key of ['BUFFER_API_KEY', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY']) {
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  }
  const lines = [];
  const log = message => { console.log(message); lines.push(message); };
  try {
    const store = new GitHubStore(process.env.GITHUB_REPOSITORY, process.env.GITHUB_TOKEN);
    const buffer = new BufferClient(process.env.BUFFER_API_KEY);
    const state = await store.load();
    if (command === 'submit') {
      const posts = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
      const available = await buffer.channels(process.env.BUFFER_ORGANIZATION_ID);
      for (const channel of available.filter(c => SERVICES.includes(c.service.toLowerCase()))) log(`Available: ${channel.service} ${channel.name} (${channel.id}), organization ${channel.organizationId}`);
      const channels = selectChannels(available, process.env.BUFFER_CHANNEL_IDS);
      for (const channel of channels) log(`Target: ${channel.service} ${channel.name} (${channel.id})`);
      await submit({ posts, state, channels, mode: process.env.BUFFER_MODE || 'draft', store, buffer, log });
    } else {
      await check({ state, store, buffer, log });
    }
  } catch (error) {
    // Do not expose credentials even if a remote error happens to echo one.
    let message = error.message;
    for (const key of [process.env.BUFFER_API_KEY, process.env.GITHUB_TOKEN]) message = message.replaceAll(key, '[REDACTED]');
    log(message);
    process.exitCode = 1;
  } finally {
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Buffer blog workflow\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\`\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
