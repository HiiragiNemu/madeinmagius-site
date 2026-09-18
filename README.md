# MadeInMagius Personal Terminal

Personal homepage for MadeInMagius tools, archives and future projects.

**GitHub Pages:** https://hiiraginemu.github.io/madeinmagius-site/

## What this repository owns

- CRT / low-fidelity terminal presentation
- program navigation and responsive layout
- GitHub Pages static fallback
- Cloudflare Pages Functions release bridge

Application binaries remain owned by their source repositories:

- `HiiragiNemu/Bilibili-Follower-Snapshot`
- `HiiragiNemu/netease-cloudmusic-delisted-exporter`

The Cloudflare release bridge reads the latest private GitHub Releases with a server-side read-only token and exposes only whitelisted download kinds. No token is shipped to the browser.

## Development

```bash
npm run check
npm run build
```

The project intentionally has no runtime or build dependencies.

## Deployment

- GitHub Pages: `.github/workflows/pages.yml`
- Cloudflare Pages: build command `npm run build`, output `dist`
- Cloudflare setup: `docs/CLOUDFLARE.md`
- old-site cutover: `docs/MIGRATION.md`
- architecture: `docs/ARCHITECTURE.md`
