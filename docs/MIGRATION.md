# Migration from the old Bilibili Pages site

The old `bilibili-follower-snapshot.pages.dev` site stays untouched until the new Cloudflare deployment is verified.

## New canonical structure

- Personal homepage: new Cloudflare hostname/custom domain
- Bilibili program: `/#bilibili` (and `/tools/bilibili/` redirect)
- NetEase program: `/#netease` (and `/tools/netease/` redirect)
- Bilibili userscript stable download: `/downloads/bilibili/userscript`
- Legacy-compatible userscript path: `/downloads/bilibili-follower-snapshot.user.js`

## Cutover order

1. Deploy `madeinmagius-site` to a new Cloudflare Pages project.
2. Configure only the read-only `GITHUB_RELEASES_TOKEN` secret.
3. Verify live metadata and all download routes against the source Release digests.
4. Update the Bilibili userscript `@downloadURL` and `@updateURL` to the new host, keeping the same legacy-compatible path.
5. Publish a normal new Bilibili release so installed userscripts learn the new update endpoint while the old site still exists.
6. Wait until that release has been served and tested.
7. Retire or redirect the old Pages project.

No source repository needs to copy artifacts into this site. Publishing a new matching GitHub Release is the synchronization event.
