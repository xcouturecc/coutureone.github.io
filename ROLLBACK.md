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

For a durable source rollback, revert the static-performance commit on the
production branch, then push:

```sh
git revert --no-edit optimization/static-performance
git push
```

The tag is created only after verification. This restores the previous `docs/` and removes the
static generator, workflow and Vercel config together. If additional automated
refresh commits exist, first disable **Refresh static blog** in GitHub Actions,
then revert those generated-page commits followed by the performance commit.
Avoid `git reset --hard` when unrelated local changes exist.

The typography checkpoint still loads articles through GitHub API; the older
`fb49d1b` checkpoint also contains the old username configuration. Prefer the
`ce3dcfc` checkpoint for functional rollback.
