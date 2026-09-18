# Architecture

## Site ownership

`madeinmagius-site` owns the personal homepage and terminal presentation. It does not own the application binaries.

Release authority remains:

- Bilibili tool: `HiiragiNemu/Bilibili-Follower-Snapshot`
- NetEase tool: `HiiragiNemu/netease-cloudmusic-delisted-exporter`

## Hosting modes

### GitHub Pages

GitHub Pages publishes `dist/`. It provides the complete terminal UI and a checked-in release metadata snapshot. Because the application repositories are private, static Pages cannot safely proxy their binaries. On this fallback host, release buttons use the source Release URLs from the snapshot and may require GitHub authentication.

### Cloudflare Pages

Cloudflare uses the same `dist/` build plus the `functions/` directory. The functions authenticate server-side with a read-only GitHub token, fetch the latest private Releases, and stream release assets through stable same-origin download routes.

No secret is exposed to browser JavaScript.

## Display engine

The new terminal is deliberately independent from `magi-reader`, while carrying forward its useful CRT ideas:

- scanline raster
- phosphor mask
- curvature/vignette treatment
- registration-like color texture

The personal site adds instability that the earlier implementation did not contain:

- sub-pixel horizontal/vertical jitter
- random sync tears
- short signal dropouts
- rolling sync band
- brightness breathing
- low-resolution temporal noise
- pointer-localized beam response
- stepped boot and panel redraw transitions

`prefers-reduced-motion` disables the major moving/glitch effects.

## Program expansion

New tools are added as program entries and panels rather than new marketing cards. The terminal shell remains the stable personal homepage while the program table grows.
