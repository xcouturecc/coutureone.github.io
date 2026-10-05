"""Validate every generated page and local asset after the real build."""
from pathlib import Path
import json
import subprocess
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1] / 'docs'
report = json.loads((root / 'build-report.json').read_text())
files = list(root.rglob('*.html'))
assert len(files) == report['articles'] + report['pages']
images = 0
for path in files:
    assert subprocess.run(['git', 'check-ignore', '--no-index', '-q', str(path)], cwd=root.parent).returncode == 1, f'Generated page is ignored: {path}'
    raw = path.read_text()
    soup = BeautifulSoup(raw, 'html.parser')
    assert soup.html['lang'] == 'zh-CN'
    assert soup.title.get_text()
    assert not any(secret in raw for secret in ['ghp_', 'bearer ', 'api.github.com/graphql'])
    assert soup.find('link', rel='canonical')
    if '/posts/' in str(path):
        assert soup.select_one('.markdown-body') is not None
        assert soup.select_one('#post > h1')
    for node in soup.select('[href], [src]'):
        for name in ['href', 'src']:
            value = node.get(name, '')
            if not value.startswith('/') or value.startswith('//'):
                continue
            asset = root / unquote(urlsplit(value).path).lstrip('/')
            if value.endswith('/'):
                asset /= 'index.html'
            assert asset.is_file(), (path, value)
    for image in soup.select('.markdown-body img[src^="/assets/"]'):
        assert image.get('width') and image.get('height')
        assert image.get('decoding') == 'async'
        images += 1
print(f'PASS: {len(files)} pages, all internal links/assets, {images} article images, no client credentials')
