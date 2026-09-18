# Cloudflare Pages deployment runbook

The repository is already prepared for Cloudflare Pages. **Do not copy release binaries into this repository.** The Pages Functions layer reads the latest GitHub Releases from the two private source repositories and streams the selected asset to visitors.

## Project settings

Create a new Cloudflare Pages project connected to:

- Repository: `HiiragiNemu/madeinmagius-site`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

`wrangler.toml` already declares the same output directory and compatibility date.

## Required secret

Create a **fine-grained GitHub personal access token** that can only read:

- `HiiragiNemu/Bilibili-Follower-Snapshot`
- `HiiragiNemu/netease-cloudmusic-delisted-exporter`

Grant repository **Contents: Read-only** and the minimum metadata access GitHub requires. Do not grant write scopes.

Store it in Cloudflare Pages as the encrypted secret:

`GITHUB_RELEASES_TOKEN`

Never add the token to GitHub, `.dev.vars`, JavaScript sent to the browser, or a normal Cloudflare environment variable.

For local Pages Functions testing, put a temporary token in an ignored `.dev.vars` file:

```
GITHUB_RELEASES_TOKEN=...
```

## What becomes live after deployment

- `/api/releases` reads the latest release metadata from both private repositories.
- `/downloads/bilibili/android` streams the newest Android APK.
- `/downloads/bilibili/userscript` streams the newest userscript.
- `/downloads/netease/windows` streams the newest Windows x64 ZIP.
- `/downloads/netease/python` streams the newest Python ZIP.
- `/downloads/bilibili-follower-snapshot.user.js` is a compatibility alias for the old userscript route.

The browser never receives the GitHub token. Updating a source repository by publishing a new release is enough for the Cloudflare site to expose the new matching asset on the next metadata/download request.

## Verification before moving the old site

1. Open `/api/releases` and confirm `source` is `cloudflare-live`.
2. Download all four canonical routes and compare the response `x-release-digest` header with the source GitHub Release digest.
3. Confirm the Bilibili compatibility userscript route resolves.
4. Test desktop and mobile layouts.
5. Only then update the Bilibili userscript metadata URL to the new hostname and retire the old Pages project.

## Custom domain

The site does not hard-code a Cloudflare hostname. A custom domain can therefore be attached later without a code change. Keep GitHub Pages enabled as a static fallback.
