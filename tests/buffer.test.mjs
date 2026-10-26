import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferClient, GitHubStore, validateManifest, selectChannels, submit, check, linkMetadata, refreshPreviews } from '../scripts/buffer.mjs';

const channels = ['linkedin', 'mastodon', 'bluesky'].map(service => ({ id: service, service, name: 'Severin', organizationId: 'org', isDisconnected: false, isLocked: false }));
const post = (slug, extra = {}) => ({ title: slug, text: slug, url: `https://svrnm.com/blog/${slug}/`, skip: false, ...extra });
const fixture = () => {
  const saved = [];
  const calls = [];
  const store = { save: async state => saved.push(structuredClone(state)) };
  const buffer = { create: async (channel, text, mode, post) => {
    calls.push({ channel, text, mode, post });
    return { id: `post-${calls.length}`, status: 'draft', dueAt: null };
  } };
  return { store, buffer, saved, calls, channels, log: () => {} };
};

test('initial baseline creates no drafts, while a subsequently published post creates three', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [post('old')] });
  assert.equal(f.calls.length, 0);
  await submit({ ...f, state, posts: [post('old'), post('new')] });
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(call => call.mode === 'draft'));
  assert.equal(f.calls[0].text, 'new\n\nhttps://svrnm.com/blog/new/');
  assert.equal(f.saved[1].posts[post('new').url].submissions.linkedin.status, 'unconfirmed');
  assert.equal(f.saved[2].posts[post('new').url].submissions.linkedin.id, 'post-1');
});

test('reruns and title edits do not resend accepted drafts', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  await submit({ ...f, state, posts: [post('new')] });
  await submit({ ...f, state, posts: [post('new', { title: 'Edited', text: 'Edited' })] });
  assert.equal(f.calls.length, 3);
});

test('partial failures preserve successful channel receipts and block uncertain retries', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  const create = f.buffer.create;
  f.buffer.create = async (...args) => {
    if (args[0].service === 'mastodon') throw new Error('request timed out');
    return create(...args);
  };
  await assert.rejects(submit({ ...f, state, posts: [post('new')] }), /timed out/);
  assert.equal(f.calls.length, 2);
  assert.ok(state.posts[post('new').url].submissions.linkedin.id);
  assert.equal(state.posts[post('new').url].submissions.mastodon.status, 'unconfirmed');
  await assert.rejects(submit({ ...f, state, posts: [post('new')] }), /Unconfirmed attempt/);
  assert.equal(f.calls.length, 2);
});

test('a failure persisting the attempt prevents the external API call', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  f.store.save = async () => { throw new Error('state write failed'); };
  await assert.rejects(submit({ ...f, state, posts: [post('new')] }), /state write failed/);
  assert.equal(f.calls.length, 0);
});

test('skip is remembered and adding channels does not silently backfill', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  await submit({ ...f, state, posts: [post('skip', { skip: true })] });
  await submit({ ...f, state, posts: [post('skip')] });
  assert.equal(f.calls.length, 0);
  await assert.rejects(submit({ ...f, state, posts: [], channels: channels.slice(1) }), /channels differ/);
});

test('channel discovery requires exactly one connected target for each service', () => {
  assert.deepEqual(selectChannels(channels), channels);
  assert.throws(() => selectChannels([...channels, { ...channels[0], id: 'other' }]), /exactly one linkedin/);
  assert.deepEqual(selectChannels([...channels, { ...channels[0], id: 'other' }], 'linkedin,mastodon,bluesky'), channels);
  assert.throws(() => selectChannels(channels, 'missing'), /not found/);
  assert.throws(() => selectChannels(channels.map(c => ({ ...c, isDisconnected: true }))), /disconnected/);
});

test('manifest validation rejects duplicate or foreign URLs', () => {
  assert.equal(validateManifest({ version: 1, posts: [post('new')] }).length, 1);
  assert.throws(() => validateManifest({ version: 1, posts: [post('new'), post('new')] }), /duplicate/);
  assert.throws(() => validateManifest({ version: 1, posts: [post('new', { url: 'https://example.com/' })] }), /Invalid/);
});

test('API draft payload is explicit and publication status uses the saved ID', async () => {
  const requests = [];
  const client = new BufferClient('test-key', async (url, options) => {
    requests.push({ url, ...JSON.parse(options.body), headers: options.headers });
    return { ok: true, json: async () => ({ data: { createPost: { post: { id: 'p1', status: 'draft' } }, post: { id: 'p1', status: 'sent' } } }) };
  });
  await client.create(channels[0], 'text', 'draft', post('new'));
  assert.equal(requests[0].variables.input.saveToDraft, true);
  assert.equal(requests[0].variables.input.needsApproval, false);
  assert.deepEqual(requests[0].variables.input.assets, []);
  await client.create(channels[0], 'text', 'queue', post('new'));
  assert.equal(requests[1].variables.input.saveToDraft, false);
  assert.equal((await client.post('p1')).status, 'sent');
  assert.deepEqual(requests[2].variables, { input: { id: 'p1' } });
});

test('status checks keep drafts pending, record sent, and flag errors without resubmitting', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  await submit({ ...f, state, posts: [post('new')] });
  f.buffer.post = async id => ({ id, status: id === 'post-1' ? 'sent' : id === 'post-2' ? 'error' : 'draft', dueAt: null });
  await assert.rejects(check({ ...f, state }), /publication failed/);
  assert.deepEqual(Object.values(state.posts[post('new').url].submissions).map(r => r.status), ['sent', 'error', 'draft']);
  assert.equal(f.calls.length, 3);
});

test('GitHub state initializes an orphan branch and later uses the file SHA', async () => {
  const requests = [];
  const store = new GitHubStore('owner/repo', 'test-token', async (url, options) => {
    requests.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    const result = url.endsWith('/git/trees') ? { sha: 'tree' } : url.endsWith('/git/commits') ? { sha: 'commit' } : options.method === 'PUT' ? { content: { sha: 'updated' } } : { sha: 'initial' };
    return { ok: true, json: async () => result };
  });
  await store.save({ version: 1, channels, posts: {} });
  assert.deepEqual(requests[1].body.parents, []);
  assert.equal(requests[2].body.ref, 'refs/heads/buffer-state');
  await store.save({ version: 1, channels, posts: {} });
  assert.equal(requests[4].body.sha, 'initial');
  assert.equal(requests[4].body.branch, 'buffer-state');
});

test('Hugo manifest includes only public blog pages, with canonical URLs and social overrides', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'svrnm-buffer-test-'));
  try {
    await mkdir(join(root, 'layouts'), { recursive: true });
    await writeFile(join(root, 'layouts/index.blogmanifest.json'), await readFile(new URL('../layouts/index.blogmanifest.json', import.meta.url)));
    for (const file of ['layouts/partials/social-images.html', 'assets/images/social-card-base.png']) {
      await mkdir(join(root, file.slice(0, file.lastIndexOf('/'))), { recursive: true });
      await writeFile(join(root, file), await readFile(new URL(`../${file}`, import.meta.url)));
    }
    await writeFile(join(root, 'hugo.toml'), `baseURL = "https://svrnm.com/"\n[outputFormats.BlogManifest]\nmediaType = "application/json"\nbaseName = "blog-manifest"\nisPlainText = true\nnotAlternative = true\n[outputs]\nhome = ["BlogManifest"]\n`);
    const writePost = async (path, frontmatter) => {
      const full = join(root, 'content', path);
      await mkdir(full.slice(0, full.lastIndexOf('/')), { recursive: true });
      await writeFile(full, `---\ntitle: Example\ndate: 2020-01-01\n${frontmatter}\n---\nBody.\n`);
    };
    await writePost('blog/public/index.md', 'url: /custom/\nsocial:\n  text: Custom announcement');
    await writePost('blog/skipped/index.md', 'social:\n  skip: true');
    await writePost('blog/covered/index.md', 'description: A description for the card.\ncover:\n  image: cover.png\n  relative: true');
    await writeFile(join(root, 'content/blog/covered/cover.png'), await readFile(new URL('../assets/images/social-card-base.png', import.meta.url)));
    await writePost('blog/explicit/index.md', 'images: [https://images.example/custom.png]');
    await writePost('blog/draft/index.md', 'draft: true');
    await writePost('blog/future/index.md', 'publishDate: 2999-01-01');
    await writePost('blog/expired/index.md', 'expiryDate: 2021-01-01');
    await writePost('videos/video.md', 'categories: [blog]');
    await writePost('publications/article.md', 'categories: [blog]');
    execFileSync('hugo', ['--source', root, '--quiet'], { stdio: 'pipe' });
    const posts = validateManifest(JSON.parse(await readFile(join(root, 'public/blog-manifest.json'), 'utf8')));
    assert.equal(posts.length, 4);
    assert.equal(posts.find(p => p.url === 'https://svrnm.com/custom/').text, 'Custom announcement');
    assert.equal(posts.find(p => p.url.includes('/skipped/')).skip, true);
    const fallback = posts.find(p => p.url === 'https://svrnm.com/custom/');
    assert.match(fallback.image, /^https:\/\/svrnm.com\/images\/social-card-base.*\.png$/);
    const png = await readFile(join(root, 'public', new URL(fallback.image).pathname));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    const cover = posts.find(p => p.url.includes('/covered/'));
    assert.equal(cover.image, 'https://svrnm.com/blog/covered/cover.png');
    assert.equal(cover.description, 'A description for the card.');
    assert.equal(posts.find(p => p.url.includes('/explicit/')).image, 'https://images.example/custom.png');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('missing state on an existing branch is not silently treated as a new baseline', async () => {
  const store = new GitHubStore('owner/repo', 'token', async url => url.includes('/contents/')
    ? { status: 404 }
    : { ok: true, json: async () => ({ ref: 'refs/heads/buffer-state' }) });
  await assert.rejects(store.load(), /state file is missing/);
});


test('LinkedIn and Bluesky receive link cards; Mastodon keeps its native URL preview', () => {
  const article = post('new', { description: 'Description', image: 'https://svrnm.com/images/card.png' });
  for (const service of ['linkedin', 'bluesky']) {
    assert.deepEqual(linkMetadata({ service }, article), { [service]: { linkAttachment: {
      url: article.url, title: article.title, description: article.description,
      thumbnail: { url: article.image },
    } } });
  }
  assert.deepEqual(linkMetadata({ service: 'mastodon' }, article), {});
});

test('submission forwards the article metadata to the Buffer client', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  const article = post('new', { description: 'Description', image: 'https://svrnm.com/images/card.png' });
  await submit({ ...f, posts: [article], state });
  assert.ok(f.calls.every(call => call.post.image === article.image && call.post.description === article.description));
});

test('refresh updates existing drafts only, without creating or scheduling posts', async () => {
  const f = fixture();
  const state = await submit({ ...f, posts: [] });
  const article = post('new', { image: 'https://svrnm.com/images/card.png' });
  await submit({ ...f, posts: [article], state });
  const edits = [];
  f.buffer.post = async id => ({ id, channelId: id === 'post-1' ? 'linkedin' : 'bluesky', status: id === 'post-1' ? 'draft' : 'sent' });
  f.buffer.editPreview = async (...args) => edits.push(args);
  await refreshPreviews({ ...f, state, posts: [article], url: article.url });
  assert.equal(edits.length, 1);
  assert.equal(edits[0][0], 'post-1');
  assert.equal(f.calls.length, 3);
  assert.ok(state.posts[article.url].submissions.linkedin.previewUpdatedAt);
  await assert.rejects(refreshPreviews({ ...f, state, posts: [article], url: 'https://svrnm.com/unknown/' }), /Refresh URL/);
});

test('preview edits send metadata without scheduling, changing text, or removing media', async () => {
  let input;
  const client = new BufferClient('test-key', async (url, options) => {
    input = JSON.parse(options.body).variables.input;
    return { ok: true, json: async () => ({ data: { editPost: { post: { id: 'existing', status: 'draft' } } } }) };
  });
  await client.editPreview('existing', channels[0], post('new'));
  assert.deepEqual(Object.keys(input).sort(), ['id', 'metadata']);
  assert.equal(input.metadata.linkedin.linkAttachment.url, post('new').url);
});
