# RSS feeds and cross-posting to dev.to

All RSS feeds (`/index.xml`, `/blog/index.xml`, tag and category feeds) carry
the full post in `content:encoded`, with tags as `<category>`. The template is
`layouts/_default/rss.xml`, a copy of PaperMod's with these changes. Re-check it
when updating the theme.

## Feed-safe content

The full text is read outside svrnm.com, in feed readers and on dev.to:

- All `src`, `href` and `poster` URLs are made absolute.
- Feed readers and dev.to strip `<video>`, `<iframe>`, `<script>` and inline
  SVG. Shortcodes that rely on them have `*.rss.xml` variants that are used only
  in feeds, and render a link (and an image, if any) back to the post or video
  instead: `video`, `deck`, `embed`, `animation`, `youtube`, `youtubeshort`.
  Alerts (`> [!NOTE]`) render without the icon
  (`layouts/_markup/render-blockquote-alert.rss.xml`).

When you add a shortcode that needs JavaScript or embeds, add a
`layouts/shortcodes/<name>.rss.xml` variant too. Check the result by running
`hugo` and opening `public/index.xml`.

## dev.to

dev.to's RSS import creates one draft per new post. Use the blog feed, not the
site-wide one, which also lists publications and videos.

In **Settings → Extensions → Publishing to DEV from RSS**:

- RSS Feed URL: `https://svrnm.com/blog/index.xml`
- Enable **Mark the RSS source as canonical URL by default**, so dev.to links
  back to svrnm.com as the original.
- Leave "Replace self-referential links with DEV-specific links" off.

dev.to does not re-import a URL it already imported. Delete old, incomplete
drafts first if you want them imported again with the full text.
