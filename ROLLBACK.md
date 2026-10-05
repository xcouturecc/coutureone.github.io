# Rollback

Before this optimization, the working typography version was saved as commit
`ce3dcfc` and tag `rollback/before-static-performance`. The original deployed
version before typography is `fb49d1b`.

A standalone archive of the typography version is saved locally at:
`/Users/couture/Documents/ChatGPT/blog/backups/before-static-performance.tar.gz`.
It includes the old deployable `docs/` folder, not credentials from local tools.
The archive is not deployed.

## Before deployment

Work is isolated on `codex/static-performance`. Switching back to `main` restores
the original site without changing remote deployments. To preview the typography
checkpoint independently:

```sh
git worktree add /tmp/blog-rollback-preview rollback/before-static-performance
python3 -m http.server 8767 --directory /tmp/blog-rollback-preview/docs
```

## After deployment

For immediate recovery in Vercel, open the previous successful production
deployment and use **Instant Rollback**. Restore the entire deployment, including
its configuration, rather than only copying an HTML file.

For a durable source rollback, restore the complete typography checkpoint. This
also handles later automatically generated-page commits without reverting each
one separately. Start with a clean working tree, disable the refresh workflow,
and update the local production branch first:

```sh
git diff --quiet && git diff --cached --quiet || exit 1
gh workflow disable build-static.yml --repo xcouturecc/coutureone.github.io
git switch main
git pull --ff-only
git restore --source rollback/before-static-performance --staged --worktree -- .
git commit -m "Restore pre-optimization blog"
git push origin main
```

This exact tree-restoration approach is also verified in an isolated checkout.
The original production deployment is
`dpl_6SpfzBcMejYnJW1aLMyXve7v9o23` (commit `fb49d1b`); its ID and URL are also
saved in `/Users/couture/Documents/ChatGPT/blog/backups/production-before-deploy.json`.

Avoid `git reset --hard` when unrelated local changes exist.

The typography checkpoint still loads articles through GitHub API; the older
`fb49d1b` checkpoint also contains the old username configuration. Prefer the
`ce3dcfc` checkpoint for functional rollback.
