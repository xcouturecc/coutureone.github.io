// Theme and old hash links are handled before the first paint.
(() => {
  let theme;
  try { theme = localStorage.getItem('theme'); } catch (_) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  const hash = location.hash;
  const post = hash.match(/^#\/posts\/(\d+)(?:\/)?$/);
  if (post) location.replace('/posts/' + post[1] + '/' + location.search);
  else if (hash === '#/' || hash === '#') location.replace('/' + location.search);
  else if (/^#\/(?:after|before)\//.test(hash)) {
    // Historic GraphQL cursors encode the creation date of the boundary issue.
    try {
      let cursor = atob(decodeURIComponent(hash.split('/').pop()));
      if (!cursor.includes('cursor:')) cursor = atob(cursor);
      const date = cursor.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
      if (date) {
        fetch('/assets/legacy-pages.json').then(r => r.json()).then(pages => {
          let page = pages[date[0]] || 1;
          page += hash.startsWith('#/after/') ? 1 : -1;
          page = Math.max(1, Math.min(pages.__count || page, page));
          location.replace(page > 1 ? '/page/' + page + '/' : '/');
        }).catch(() => location.replace('/'));
      } else location.replace('/');
    } catch (_) { location.replace('/'); }
  }
})();
