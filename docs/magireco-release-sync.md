# Magireco release delivery

New releases after the historical 1.3.8 boundary use a generic signed identity,
not another version-specific site branch. Canonical public versions are X.Y.Z
(including 1.4.0 and 2.0.0). Android version_code determines build ordering.
The publisher key, package, channel, certificates and repository stay pinned.
An optional legacy discovery number must explicitly map to the same signed APK.

Upload the version-named APK and corresponding source archive first. Both must
have their final GitHub size/digest and uploaded state. Publish signed current
metadata last. Keep earlier version-named assets available for retained snapshots.
Do not overwrite an existing build code with different bytes.

The existing distribution mirror workflow runs tools/sync_site_snapshot.py only
after mirror_release.py succeeds. It uses the existing GH_TOKEN, clones this
repository and invokes:

    node scripts/sync-magireco-release.mjs --receipt VERIFIED_MIRROR_REPORT

The script reads only public GitHub release metadata, checks the mirror receipt,
publisher signature, actual APK/source asset identities and monotonic build code,
then updates data/magireco-release.json and data/magireco-release.signed.json.
The helper commits only those two files with a fast-forward guard. The normal
main push then builds GitHub Pages and Cloudflare Pages. Unchanged data is a no-op;
invalid signatures, incomplete uploads or concurrent branch changes retain the
previous published snapshot. No additional timer or permission expansion is used.

For a manual authorized publication, the same sync command can be run without
--receipt after the canonical assets are published, followed by check/build and
the normal main commit. npm run check validates the current snapshot against its
canonical signed metadata, rather than against a hardcoded latest version.

The browser presents the static snapshot first. A failed or stale live Function
never clears it. Snapshot downloads go directly to version-named GitHub assets;
they do not require a functioning Cloudflare Worker. A compatible live response
can replace the snapshot only without regressing or conflicting with its build.

CI availability and account access remain operational dependencies. A failed
sync must be reported and retried through this same command, not by removing
signature checks, redirecting to the 1.1.11 bridge, or rolling back client data.
