#!/usr/bin/env python3
"""Generate a static blog from public GitHub Issues; publish only after success."""
from __future__ import annotations
import argparse
import hashlib
from datetime import datetime
from zoneinfo import ZoneInfo
import html
import io
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, unquote
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REPO = 'xcouturecc/gitblog'
AUTHOR = 'xcouturecc'
ORIGIN = 'https://blog.xcouture.cc'
PER_PAGE = 5
CACHE = ROOT / '.cache'
IMAGE_HOSTS = {'cdn.jsdelivr.net', 'raw.githubusercontent.com', 'github.com', 'user-images.githubusercontent.com', 'private-user-images.githubusercontent.com', 'avatars.githubusercontent.com'}


def request(url, accept=None, token=None):
    headers = {'User-Agent': 'CoutureBlog-static-builder'}
    if accept:
        headers['Accept'] = accept
    if token and url.startswith('https://api.github.com/'):
        headers['Authorization'] = f'Bearer {token}'
    with urlopen(Request(url, headers=headers), timeout=15) as response:
        data = response.read(25 * 1024 * 1024 + 1)
        if len(data) > 25 * 1024 * 1024:
            raise ValueError('Asset exceeds 25 MB')
        return data


def api(path):
    return json.loads(request('https://api.github.com/' + path,
                             'application/vnd.github.full+json', os.getenv('GITHUB_TOKEN')))


def load_issues(fixture=None):
    if fixture:
        values = json.loads(Path(fixture).read_text())
    else:
        values = []
        page = 1
        while True:
            batch = api(f'repos/{REPO}/issues?state=open&sort=created&direction=desc&per_page=100&page={page}')
            values.extend(batch)
            if len(batch) < 100:
                break
            page += 1
    issues = [i for i in values if not i.get('pull_request') and i['user']['login'] == AUTHOR]
    if not issues or any('body_html' not in i for i in issues):
        raise ValueError('Missing issues or rendered HTML; keep previous output')
    return sorted(issues, key=lambda i: i['created_at'], reverse=True)


def canonical_image(url):
    # Old username/branch URLs still appear in existing posts.
    url = url.replace('/coutureone/gitblog', '/xcouturecc/gitblog')
    return url.replace('/gitblog@main/', '/gitblog@master/').replace('/gitblog/main/', '/gitblog/master/')


class Assets:
    def __init__(self, output, enabled=True):
        self.output, self.enabled = output, enabled
        self.images = {}
        self.stats = {'original_bytes': 0, 'served_bytes': 0, 'optimized': 0, 'external': 0}

    def image(self, url):
        if url in self.images:
            return self.images[url]
        if not self.enabled or urlparse(url).hostname not in IMAGE_HOSTS:
            self.stats['external'] += 1
            return None
        key = hashlib.sha256(url.encode()).hexdigest()[:20]
        cache = CACHE / 'images' / key
        cache.parent.mkdir(parents=True, exist_ok=True)
        try:
            if not cache.exists():
                cache.write_bytes(request(url))
            original = cache.read_bytes()
            key = hashlib.sha256(original).hexdigest()[:20]
            image = Image.open(io.BytesIO(original))
            if getattr(image, 'is_animated', False):
                return None
            image = ImageOps.exif_transpose(image)
            width, height = image.size
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
            variants = []
            for target in sorted({min(width, 800), min(width, 1600)}):
                resized = image.copy()
                resized.thumbnail((target, round(height * target / width)), Image.Resampling.LANCZOS)
                data = io.BytesIO()
                resized.save(data, format='WEBP', quality=85, method=6)
                variants.append((resized.width, data.getvalue()))
            asset_dir = self.output / 'assets/images'
            asset_dir.mkdir(parents=True, exist_ok=True)
            if len(variants[-1][1]) < len(original):
                links = []
                for size, data in variants:
                    name = f'{key}-{size}.webp'
                    (asset_dir / name).write_bytes(data)
                    links.append((size, '/assets/images/' + name))
                result = {'src': links[-1][1], 'srcset': ', '.join(f'{link} {size}w' for size, link in links), 'width': width, 'height': height}
                self.stats['served_bytes'] += len(variants[-1][1])
                self.stats['optimized'] += 1
            else:
                suffix = '.' + Image.open(io.BytesIO(original)).format.lower().replace('jpeg', 'jpg')
                name = key + suffix
                (asset_dir / name).write_bytes(original)
                result = {'src': '/assets/images/' + name, 'width': width, 'height': height}
                self.stats['served_bytes'] += len(original)
            self.stats['original_bytes'] += len(original)
            self.images[url] = result
            return result
        except Exception as error:
            print(f'Image kept external ({type(error).__name__}): {urlparse(url).hostname}')
            self.stats['external'] += 1
            self.images[url] = None
            return None


def render_content(content, assets, number):
    soup = BeautifulSoup(content or '', 'html.parser')
    for anchor in soup.select('a[href]'):
        url = anchor['href']
        match = re.match(r'https://github.com/(?:xcouturecc|coutureone)/gitblog/issues/(\d+)(.*)', url)
        if match and not match[2]:
            anchor['href'] = f'/posts/{match[1]}/'
        if anchor.get('target') == '_blank':
            anchor['rel'] = ['noopener', 'noreferrer']
    for n, image in enumerate(soup.select('img')):
        source = canonical_image(image.get('data-canonical-src') or image.get('src', ''))
        image['src'] = source
        image.attrs.pop('data-canonical-src', None)
        optimized = assets.image(source)
        if optimized:
            image.attrs.update(optimized)
            if optimized.get('srcset'):
                image['sizes'] = '(max-width: 600px) calc(100vw - 40px), 720px'
            parent = image.parent
            if parent.name == 'a' and parent.get('href'):
                parent['href'] = optimized['src']
        image['loading'] = 'eager' if n == 0 else 'lazy'
        image['decoding'] = 'async'
        image.attrs.pop('style', None)
    # Convert GitHub's enrichment wrapper to an ordinary visible code block.
    for section in soup.select('section[data-type="mermaid"]'):
        target = section.select_one('[data-plain]')
        source = target.get('data-plain') if target else None
        if not source:
            pre = section.find('pre')
            source = pre.get_text() if pre else None
        if source:
            pre = soup.new_tag('pre', attrs={'data-lang': 'mermaid'})
            code = soup.new_tag('code')
            code.string = source
            pre.append(code)
            section.replace_with(pre)
    # Render GitHub's Mermaid source locally; keep fallback code when the CDN fails.
    for pre in soup.select('pre'):
        code = pre.find('code')
        if pre.get('lang') == 'mermaid' or 'mermaid' in ' '.join(pre.get('class', [])):
            pre['data-lang'] = 'mermaid'
    for artifact in soup.select('.js-render-enrichment-loader, .octospinner'):
        artifact.decompose()
    return str(soup)


def display_date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Shanghai')).strftime('%b %d, %Y').replace(' 0', ' ')


def esc(value):
    return html.escape(str(value), quote=True)


def asset_url(name):
    source = ROOT / 'site' / name
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    return f'/assets/{source.stem}.{digest}{source.suffix}'


def page(title, body, path='/', description='用于记录一些琐碎', article=None):
    footer = f'''<div id="footer">© {datetime.now(ZoneInfo('Asia/Shanghai')).year} Couture's Blog. Powered by <a href="https://github.com/LoeiFy/Mirror" target="_blank" rel="noopener noreferrer">Mirror</a> . <a href="https://github.com/{REPO}/issues" target="_blank" rel="noopener noreferrer">Source</a></div>'''
    body = body.replace('<!-- site-footer -->', footer)
    meta = ''
    if article:
        meta = f'<meta property="og:type" content="article"><meta property="article:published_time" content="{esc(article["created_at"])}">'
    return f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description[:160])}">
<link rel="canonical" href="{ORIGIN}{path}"><meta property="og:title" content="{esc(title)}"><meta property="og:url" content="{ORIGIN}{path}">{meta}
<link rel="icon" href="{asset_url('favicon.svg')}" type="image/svg+xml"><link rel="alternate" type="application/atom+xml" title="RSS" href="/feed.xml">
<script src="{asset_url('theme-init.js')}"></script><link rel="stylesheet" href="{asset_url('base.css')}"><link rel="stylesheet" href="{asset_url('theme.css')}">
<script src="{asset_url('runtime.js')}" defer></script></head><body>
<button class="theme-toggle" id="theme-toggle" aria-label="切换明暗主题"><span class="sun">☀️</span><span class="moon">🌙</span></button>
<main class="page {'single' if article else 'home'}"><div>{body}</div></main>
</body></html>'''


def write(output, path, text):
    target = output / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)


def build(output, issues, images=True):
    assets = Assets(output, images)
    # Fetch independent images concurrently; a slow remote host never blocks all images.
    if images:
        urls = {issues[0]['user']['avatar_url'] + '&s=200'}
        for issue in issues:
            soup = BeautifulSoup(issue['body_html'], 'html.parser')
            urls.update(canonical_image(i.get('data-canonical-src') or i.get('src', '')) for i in soup.select('img'))
        unavailable = set()
        def cache_image(url):
            if urlparse(url).hostname not in IMAGE_HOSTS:
                return
            path = CACHE / 'images' / hashlib.sha256(url.encode()).hexdigest()[:20]
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists() and time.time() - path.stat().st_mtime < 6 * 3600:
                return
            try:
                path.write_bytes(request(url))
            except Exception:
                if not path.exists():
                    unavailable.add(url)
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(cache_image, urls))
        assets.images.update({url: None for url in unavailable})
        assets.stats['external'] = len(unavailable)
    (output / 'assets').mkdir(parents=True, exist_ok=True)
    for name in ['base.css', 'theme.css', 'runtime.js', 'favicon.svg', 'theme-init.js', 'LICENSE-Mirror.txt', 'LICENSE-github-markdown-css.txt']:
        destination = asset_url(name).split('/')[-1] if name.endswith(('.css', '.js', '.svg')) else name
        shutil.copy2(ROOT / 'site' / name, output / 'assets' / destination)
    user = issues[0]['user']
    avatar = assets.image(user['avatar_url'] + '&s=200')
    avatar_src = avatar['src'] if avatar else user['avatar_url']
    social_links = [
        ('github', 'GitHub', f'https://github.com/{AUTHOR}'),
        ('email', 'Email', 'mailto:couturecome@gmail.com'),
        ('running', '跑步记录', 'https://run.xcouture.cc'),
        ('twitter', 'X', 'https://x.com/xcouturec'),
        ('telegram', 'Telegram', 'https://t.me/couturecc'),
        ('rss', 'RSS', '/feed.xml'),
        ('friends', '友链', '/posts/44/'),
    ]
    social = []
    for icon, label, url in social_links:
        target = ' target="_blank" rel="noopener noreferrer"' if icon != 'friends' else ''
        svg = (ROOT / 'site/icons' / (icon + '.svg')).read_text()
        social.append(f'<a href="{esc(url)}" aria-label="{label}" title="{label}"{target}>{svg}</a>')
    social = ''.join(social)
    profile = f'''<div id="user"><a href="/"><img src="{esc(avatar_src)}" width="100" height="100" alt="Couture" decoding="async"></a><h1>Couture</h1><p>Persistence is the most valuable thing</p><div class="social" aria-label="社交链接">{social}</div></div>'''
    count = (len(issues) + PER_PAGE - 1) // PER_PAGE
    for n in range(1, count + 1):
        rows = []
        for issue in issues[(n-1)*PER_PAGE:n*PER_PAGE]:
            labels = ''.join(f'<span>#{esc(label["name"])}</span>' for label in issue['labels'][:3])
            rows.append(f'<a class="post" href="/posts/{issue["number"]}/"><h2>{esc(issue["title"])}</h2><div>{labels}</div><p>{display_date(issue["created_at"])}</p></a>')
        pagination = ''
        if n > 1:
            previous = '/' if n == 2 else f'/page/{n-1}/'
            pagination += f'<a class="button" href="{previous}">Previous</a>'
        if n < count:
            pagination += f'<a class="button" href="/page/{n+1}/">Next</a>'
        path = '/' if n == 1 else f'/page/{n}/'
        body = profile + '<div id="posts">' + ''.join(rows) + pagination + '<!-- site-footer --></div>'
        write(output, 'index.html' if n == 1 else f'page/{n}/index.html', page("Couture's Blog", body, path))
    for issue in issues:
        number = issue['number']
        content = render_content(issue['body_html'], assets, number)
        plain = BeautifulSoup(content, 'html.parser').get_text(' ', strip=True)
        labels = ''.join(f'<a href="{esc(label["url"].replace("api.github.com/repos/", "github.com/"))}">#{esc(label["name"])}</a>' for label in issue['labels'])
        github = issue['html_url']
        comments_control = f'<button type="button" class="button load-comments" data-count="{issue["comments"]}">View Comments ({issue["comments"]})</button>' if issue['comments'] else f'<a class="button" href="{github}#new_comment_field" target="_blank" rel="noopener noreferrer">Add Comments</a>'
        body = f'''<article id="post"><a class="back" href="/" aria-label="返回">{(ROOT / "site/icons/back.svg").read_text()}</a><h1>{esc(issue['title'])}</h1><p>Updated at<span>{display_date(issue['updated_at'])}</span></p><div class="markdown-body">{content}</div><div class="labels">{labels}</div><section id="comments" data-issue="{number}" aria-label="评论"><div class="comments-actions">{comments_control}</div><div class="comments-list" aria-live="polite"></div><!-- site-footer --></section></article>'''
        write(output, f'posts/{number}/index.html', page(issue['title'] + " - Couture's Blog", body, f'/posts/{number}/', plain, issue))
    feed = request(f'https://raw.githubusercontent.com/{REPO}/master/feed.xml').decode()
    feed = re.sub(r'https://blog\.xcouture\.cc/#/posts/(\d+)', r'https://blog.xcouture.cc/posts/\1/', feed)
    write(output, 'feed.xml', feed)
    urls = ['/'] + [f'/posts/{i["number"]}/' for i in issues]
    write(output, 'sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{ORIGIN}{p}</loc></url>' for p in urls) + '</urlset>')
    write(output, 'robots.txt', f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n')
    # Cursors in historical RSS/browser links retain a usable pagination destination.
    write(output, 'assets/legacy-pages.json', json.dumps({'__count': count, **{i['created_at']: n // PER_PAGE + 1 for n, i in enumerate(issues)}}))
    report = {'articles': len(issues), 'pages': count, 'images': assets.stats}
    write(output, 'build-report.json', json.dumps(report, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture')
    parser.add_argument('--skip-images', action='store_true')
    args = parser.parse_args()
    issues = load_issues(args.fixture)
    # A failed API or build never deletes the last successful site.
    staging = Path(tempfile.mkdtemp(prefix='.build-', dir=ROOT))
    try:
        report = build(staging, issues, not args.skip_images)
        target = ROOT / 'docs'
        previous = ROOT / '.build-staging'
        if previous.exists():
            shutil.rmtree(previous)
        if target.exists():
            target.rename(previous)
        try:
            shutil.move(str(staging), target)
        except Exception:
            if target.exists():
                shutil.rmtree(target)
            if previous.exists():
                previous.rename(target)
            raise
        if previous.exists():
            shutil.rmtree(previous)
        print(json.dumps(report, indent=2))
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == '__main__':
    main()
