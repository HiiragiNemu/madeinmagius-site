# GitHub Pages

The repository uses a custom GitHub Actions Pages workflow.

Expected public URL:

`https://hiiraginemu.github.io/madeinmagius-site/`

## One-time repository switch

GitHub requires Pages to be enabled once at the repository level before `actions/configure-pages` can deploy.

Open repository **Settings → Pages** and set **Source** to **GitHub Actions**.

After that, any push to `main` automatically:

1. runs source and Cloudflare bridge tests,
2. builds `dist/`,
3. smoke-tests the generated site,
4. uploads the Pages artifact,
5. deploys it to the `github-pages` environment.

The site is entirely relative-path safe under the `/madeinmagius-site/` project prefix.
