**<p align="center">[Couture's Blog](https://blog.xcouture.cc)</p>**
=====================================================================

**<p align="center">用于记录一些琐碎的事情</p>**

## Static site

The blog reads public Issues from `xcouturecc/gitblog` at build time. Generated
HTML, CSS, images, RSS and sitemap are committed to `docs/`; Vercel serves that
folder directly. Reading articles requires no GitHub API request or API token.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-build.txt
.venv/bin/python -m unittest discover -s tests
.venv/bin/python scripts/build.py
python3 -m http.server 8766 --directory docs
```

GitHub Actions checks for new/edited Issues every 30 minutes, and can also be
started with **Actions → Refresh static blog → Run workflow**. Scheduled runs
may be delayed by GitHub. A generated-pages commit triggers Vercel's existing
Git integration. The workflow must be enabled on the production branch. A failed
content fetch/build retains the previously generated site.

Comments load only when requested. If GitHub is unavailable, article text remains
readable and the comment section offers a GitHub link. Old `/#/posts/NUMBER` links
redirect to `/posts/NUMBER/`. Comment Markdown formatting and avatars are retained; executable HTML is filtered. Repository and GitHub attachment images are downloaded at build
time, sized for 800/1600px displays when useful, and served from the site's own
origin. Animated and failed image downloads retain their original URL. Image
cache refreshes every six hours and output filenames include a content hash.

Mirror is no longer required for this static build. Do not copy its older
`docs/` output over this site.
