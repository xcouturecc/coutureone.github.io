import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def issue(number=1, title='中文与 English', **overrides):
    result = {'number': number, 'title': title, 'body_html': '<p>正文已在 HTML 中。</p>',
              'user': {'login': 'xcouturecc', 'avatar_url': 'https://example.com/avatar.png'},
              'created_at': '2026-10-05T00:00:00Z', 'updated_at': '2026-10-05T00:00:00Z',
              'labels': [], 'comments': 0, 'html_url': f'https://github.com/xcouturecc/gitblog/issues/{number}'}
    result.update(overrides)
    return result


class StaticTests(unittest.TestCase):
    def test_pages_have_content_without_javascript_and_safe_titles(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(builder, 'request', return_value=b'<feed/>'):
            output = Path(directory)
            builder.build(output, [issue(n, '<script>bad</script>') for n in [1,2,3,4,5,6,44]], False)
            post = (output / 'posts/1/index.html').read_text()
            soup = BeautifulSoup(post, 'html.parser')
            self.assertIn('正文已在 HTML 中。', soup.select_one('.markdown-body').get_text())
            self.assertIn('&lt;script&gt;bad&lt;/script&gt;', post)
            self.assertNotIn('api.github.com/graphql', post)
            self.assertNotIn('ghp_', post)
            self.assertTrue((output / 'page/2/index.html').exists())
            for path in output.rglob('*.html'):
                for anchor in BeautifulSoup(path.read_text(), 'html.parser').select('a[href^="/"]'):
                    href = anchor['href']
                    if href.endswith('/'):
                        self.assertTrue((output / href.strip('/') / 'index.html').exists(), href)

    def test_enrichment_mermaid_and_internal_links(self):
        body = '<section data-type="mermaid"><div data-plain="graph TD\nA--&gt;B"><pre hidden>fallback</pre></div></section><a href="https://github.com/coutureone/gitblog/issues/3">文章</a>'
        with tempfile.TemporaryDirectory() as directory:
            rendered = builder.render_content(body, builder.Assets(Path(directory), False), 1)
            soup = BeautifulSoup(rendered, 'html.parser')
            self.assertEqual(soup.select_one('pre[data-lang="mermaid"]').get_text(), 'graph TD\nA-->B')
            self.assertEqual(soup.a['href'], '/posts/3/')
            self.assertNotIn('hidden', rendered)

    def test_images_keep_ratio_and_supply_responsive_sizes(self):
        data = io.BytesIO()
        Image.new('RGB', (2400, 1200), '#99aabb').save(data, 'PNG')
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as cache, patch.object(builder, 'CACHE', Path(cache)), patch.object(builder, 'request', return_value=data.getvalue()):
            asset = builder.Assets(Path(directory)).image('https://raw.githubusercontent.com/xcouturecc/gitblog/master/img/test.png')
            self.assertEqual((asset['width'], asset['height']), (2400, 1200))
            self.assertIn('800w', asset['srcset'])
            self.assertIn('1600w', asset['srcset'])
            self.assertTrue((Path(directory) / asset['src'].lstrip('/')).exists())

    def test_api_failure_keeps_existing_site(self):
        with patch.object(builder, 'load_issues', side_effect=RuntimeError('API unavailable')), patch('sys.argv', ['build.py']):
            before = (ROOT / 'docs/index.html').read_bytes()
            with self.assertRaises(RuntimeError):
                builder.main()
            self.assertEqual((ROOT / 'docs/index.html').read_bytes(), before)

    def test_publish_failure_restores_old_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'docs').mkdir()
            (root / 'docs/index.html').write_text('old site')
            with patch.object(builder, 'ROOT', root), patch.object(builder, 'load_issues', return_value=[issue()]), patch.object(builder, 'build', return_value={}), patch.object(builder.shutil, 'move', side_effect=OSError('disk failure')), patch('sys.argv', ['build.py']):
                with self.assertRaises(OSError):
                    builder.main()
            self.assertEqual((root / 'docs/index.html').read_text(), 'old site')

    def test_non_owner_and_pull_requests_are_not_posts(self):
        values = [issue(), issue(2, user={'login': 'someone'}), issue(3, pull_request={"url": "https://example.com"})]
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as fixture:
            json.dump(values, fixture)
            fixture.flush()
            self.assertEqual([i['number'] for i in builder.load_issues(fixture.name)], [1])


if __name__ == '__main__':
    unittest.main()
