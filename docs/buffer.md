# Blog announcements through Buffer

After a successful push deployment to GitHub Pages, `buffer.yml` downloads the
blog manifest from that exact deployment and creates drafts for new blog posts.
LinkedIn, Mastodon, and Bluesky are the target services. Drafts must be manually
scheduled or published in Buffer; deploying the site does not publish them.

## Configuration

Add a personal Buffer API key as the repository Actions secret `BUFFER_API_KEY`.
It needs `accountRead`, `postsRead`, and `postsWrite`. Replace the GitHub secret
when the key expires (Buffer currently allows up to one year).

The workflow discovers connected channels across your Buffer organizations.
There must be exactly one connected, unlocked channel for each target service.
If discovery is ambiguous, the run stops before submitting anything. Its logs
explain which service is ambiguous. Configure these optional Actions variables:

- `BUFFER_ORGANIZATION_ID`: restrict discovery to one organization.
- `BUFFER_CHANNEL_IDS`: three comma-separated IDs, one for each target service.
- `BUFFER_MODE`: `draft` by default. Set to `queue` only when ready to schedule
  future announcements automatically in the next available Buffer queue slots.
  Changing this does not schedule drafts already created.

Only the Buffer job has repository write permission, used for its state branch.
It uses the GitHub Actions token; no separate GitHub token secret is needed.

## Detection and receipts

Hugo generates `/blog-manifest.json` from published regular pages in the `blog`
section. Videos and publications are excluded, even if categorized as `blog`.
Drafts, expired content, and future-dated content are excluded by Hugo. Canonical
URLs come from Hugo, so custom slugs and URLs work.

The first successful Buffer run records all current posts as the baseline and
creates no drafts. New URLs on subsequent deployments create one draft per
channel, with the title and canonical URL as the default text. Edits to a known
URL do not create another announcement. A draft becoming public is new if it
was not in the baseline. Changing a published post's canonical URL is treated
as a new post; add `social.skip` when renaming a post to avoid announcing it again.

Future-dated posts require a later site deployment to become public. The status
schedule does not rebuild or deploy the website. Manually dispatched site
builds do not submit announcements; push deployments do. Use a push deployment
when initially enabling the workflow or publishing a new post.

Records are stored in `buffer-state.json` on a separate orphan branch called
`buffer-state`. This avoids expiring caches and does not modify `main` or trigger
another site deployment. The records include target channels, baseline posts,
per-channel attempts, accepted Buffer IDs, status, scheduled time, and—when
available—publication time and the destination social post URL. Treat this
branch as durable data: do not delete it to reset the workflow.

Every six hours, and on manual dispatch of the Buffer workflow, saved IDs are
checked against Buffer. Drafts remain pending until manually scheduled. `sent`
confirms Buffer reports successful publication. Publishing errors fail the
workflow and appear in its job summary with the Buffer ID and error message.
Resolve those posts in Buffer; the workflow never resubmits a failed post.

## Customize a blog announcement

Add top-level front matter to a blog post:

```yaml
social:
  text: "A short introduction for social media."
```

The canonical URL is appended automatically. The same text is used on all three
channels, so keep it suitable for Bluesky's shorter post length limit.

To suppress an announcement:

```yaml
social:
  skip: true
```

A skipped published post is recorded as skipped. Removing the flag later does
not retroactively announce it.

## Recover an unconfirmed attempt

An attempt is saved before contacting Buffer. If the request times out, the
runner stops, or saving its receipt fails, the durable record blocks automatic
retry for that channel. This is deliberate: the draft might already exist.
Successful channels keep their receipts, and other channels can still succeed.

1. Inspect Buffer for that blog URL and channel. The Actions log may also contain
   a returned Buffer ID if only receipt persistence failed.
2. If the draft exists, edit its submission in `buffer-state.json` on the
   `buffer-state` branch to include its `id` and actual `status`.
3. Only if you have confirmed no draft exists, remove that channel's unconfirmed
   submission record. The next push deployment will retry it.
4. Preserve the post entry, baseline, and every other channel's receipts.

Changing selected channels after initialization also stops submission. Review
and update the saved channel list intentionally; otherwise newly added channels
could receive unexpected announcements for posts already handled elsewhere.

## Validation

Run `node --test tests/buffer.test.mjs` and `hugo --minify`. Tests use fake clients
and do not write to Buffer or GitHub. Check the Actions summary after the first
real deployment: it should name the three channels and report baseline creation
with zero submissions. The next new blog post should produce three drafts.

Official API documentation:
- https://developers.buffer.com/guides/your-first-post.html
- https://developers.buffer.com/reference.html
- https://support.buffer.com/en-us/articles/how-to-create-your-buffer-api-key-ShIgYVwM6j
