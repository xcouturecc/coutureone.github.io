
  // 主题管理系统
  class ThemeManager {
    constructor() {
      this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.currentTheme = this.getInitialTheme();
      this.init();
    }

    getInitialTheme() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
      return this.darkModeQuery.matches ? 'dark' : 'light';
    }

    init() {
      this.applyTheme(this.currentTheme);

      // 监听系统主题变化
      this.darkModeQuery.addListener((e) => {
        if (!localStorage.getItem('theme')) {
          const newTheme = e.matches ? 'dark' : 'light';
          this.applyTheme(newTheme);
        }
      });
    }

    applyTheme(theme) {
      this.currentTheme = theme;
      window.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      this.updateThemeIcon(theme);
    }

    updateThemeIcon(theme) {
      const moonIcon = document.querySelector('.moon');
      const sunIcon = document.querySelector('.sun');
      if (moonIcon && sunIcon) {
        if (theme === 'dark') {
          moonIcon.style.opacity = 0;
          sunIcon.style.opacity = 1;
        } else {
          moonIcon.style.opacity = 1;
          sunIcon.style.opacity = 0;
        }
      }
    }

    toggleTheme() {
      const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    }

    clearThemePreference() {
      localStorage.removeItem('theme');
      const systemTheme = this.darkModeQuery.matches ? 'dark' : 'light';
      this.applyTheme(systemTheme);
    }
  }

  window.themeManager = new ThemeManager();

  // 事件监听
  document.addEventListener('DOMContentLoaded', () => {
    renderFriendLinks();
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.themeManager) {
          window.themeManager.toggleTheme();
        }
      });

      themeToggle.addEventListener('dblclick', () => {
        if (window.themeManager) {
          window.themeManager.clearThemePreference();
        }
      });
    }

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
      });
    }

    // 立即应用主题
    if (window.themeManager) {
      window.themeManager.applyTheme(window.themeManager.currentTheme);
    }
  });

  window.addEventListener('load', () => {
    clearLoadingState();
    renderFriendLinks();
    if (window.themeManager) {
      window.themeManager.applyTheme(window.themeManager.currentTheme);
    }
  });

  function clearLoadingState() {
    // Static pages already contain the article; there is no loading overlay.
  }

  function iconSvg(path) {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  }

  function labelExistingSocialLinks(social) {
    const labels = [
      { test: href => href.includes('github.com/xcouturecc'), label: 'GitHub' },
      { test: href => href.startsWith('mailto:'), label: 'Email' },
      { test: href => href.includes('run.xcouture.cc'), label: '跑步记录' },
      { test: href => href.includes('blog.xcouture.cc'), label: '博客首页' }
    ];

    Array.from(social.querySelectorAll('a[href]')).forEach((anchor) => {
      const href = anchor.href || anchor.getAttribute('href') || '';
      const match = labels.find(({ test }) => test(href));
      if (!match) return;
      anchor.title = match.label;
      anchor.setAttribute('aria-label', match.label);
      if (anchor.target === '_blank') {
        anchor.rel = 'noopener noreferrer';
      }
    });
  }

  function renderFriendLinks() {
    const social = document.querySelector('#user .social');
    if (!social) return;
    labelExistingSocialLinks(social);
  }

  function normalizeBlogAssetUrl(url) {
    if (!url) return url;
    return url
      .replace('https://cdn.jsdelivr.net/gh/coutureone/gitblog@main/', 'https://cdn.jsdelivr.net/gh/coutureone/gitblog@master/')
      .replace('https://raw.githubusercontent.com/xcouturecc/gitblog/main/', 'https://raw.githubusercontent.com/xcouturecc/gitblog/master/');
  }

  function normalizeBlogImages(root = document) {
    const images = root.matches && root.matches('img')
      ? [root]
      : Array.from(root.querySelectorAll('img'));

    images.forEach((img) => {
      const canonicalSrc = img.getAttribute('data-canonical-src');
      const normalizedCanonical = normalizeBlogAssetUrl(canonicalSrc);
      const currentSrc = img.getAttribute('src');
      const normalizedSrc = normalizeBlogAssetUrl(currentSrc);

      if (normalizedCanonical && normalizedCanonical !== canonicalSrc) {
        img.setAttribute('data-canonical-src', normalizedCanonical);
        img.src = normalizedCanonical;
      } else if (normalizedSrc && normalizedSrc !== currentSrc) {
        img.src = normalizedSrc;
      }

      if (!img.loading) {
        img.loading = 'lazy';
      }
      img.decoding = 'async';
    });
  }

  function configureMermaid() {
    if (typeof mermaid === 'undefined') return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: false },
      themeVariables: {
        fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mermaid').trim(),
        darkMode: isDark,
        background: isDark ? '#161b22' : '#f6f8fa',
        primaryColor: isDark ? '#1f2937' : '#ffffff',
        secondaryColor: isDark ? '#283548' : '#fff7cc',
        tertiaryColor: isDark ? '#30363d' : '#eef2ff',
        mainBkg: isDark ? '#1f2937' : '#f6f8ff',
        secondBkg: isDark ? '#283548' : '#fff7cc',
        primaryTextColor: isDark ? '#e6edf3' : '#24292f',
        secondaryTextColor: isDark ? '#e6edf3' : '#24292f',
        tertiaryTextColor: isDark ? '#e6edf3' : '#24292f',
        primaryBorderColor: isDark ? '#8b949e' : '#4f46e5',
        lineColor: isDark ? '#c9d1d9' : '#374151',
        tertiaryBorderColor: isDark ? '#8b949e' : '#4f46e5',
        edgeLabelBackground: isDark ? '#161b22' : '#ffffff',
        noteTextColor: isDark ? '#e6edf3' : '#24292f'
      }
    });
  }

  // 初始化 Mermaid
  if (typeof mermaid !== 'undefined') {
    configureMermaid();
  }

  // Mermaid渲染器
  class MermaidRenderer {
    constructor() {
      this.processedElements = new WeakSet();
      this.activeFullscreen = null;
      this.init();
      this.bindFullscreenEvents();
    }

    init() {
      this.renderAll();
    }

    loadMermaid() {
      if (window.mermaid) return Promise.resolve();
      if (this.loadingPromise) return this.loadingPromise;
      this.loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
        script.async = true;
        const timeout = setTimeout(() => fail(), 20000);
        const fail = () => {
          clearTimeout(timeout);
          script.remove();
          this.loadingPromise = null;
          reject(new Error('图表库加载失败，请刷新重试。'));
        };
        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        script.onerror = fail;
        document.head.appendChild(script);
      });
      return this.loadingPromise;
    }

    renderAll() {
      document.querySelectorAll('.markdown-body').forEach((body) => {
        this.renderMermaidDiagrams(body);
      });
    }

    async renderMermaidDiagrams(container) {
      if (!container) return;

      const allPres = container.querySelectorAll('pre');

      for (const block of allPres) {
        if (this.processedElements.has(block)) continue;

        const code = block.querySelector('code');
        const text = (code ? code.textContent : block.textContent || block.innerText || '').trim();

        if (this.isMermaidBlock(block, code, text)) {
          this.processedElements.add(block);

          try {
            await this.loadMermaid();
            if (!block.isConnected) continue;
            configureMermaid();
            const graphDiv = document.createElement('div');
            graphDiv.className = 'mermaid-diagram';
            graphDiv.dataset.mermaidSource = text;
            const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const result = await window.mermaid.render(id, text);
            graphDiv.innerHTML = typeof result === 'string' ? result : result.svg;
            const panel = this.createDiagramPanel(graphDiv);

            if (block.parentNode) {
              block.parentNode.insertBefore(panel, block);
              block.parentNode.removeChild(block);
            }
            this.applyDiagramTypography(graphDiv);
            this.fitDiagram(graphDiv);
            clearLoadingState();
          } catch (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mermaid-error';
            errorDiv.textContent = `Mermaid render failed:\n${error.message || error}`;
            if (block.parentNode) {
              block.parentNode.insertBefore(errorDiv, block);
            }
            clearLoadingState();
          }
        }
      }
    }

    fitDiagram(graphDiv) {
      const svg = graphDiv.querySelector('svg');
      if (!svg) return;

      const isFullscreen = graphDiv.closest('.mermaid-panel.is-fullscreen');
      const viewBox = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      const naturalWidth = viewBox.length === 4 && Number.isFinite(viewBox[2])
        ? Math.ceil(viewBox[2])
        : Math.ceil(svg.getBoundingClientRect().width);
      const containerWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width);
      const wideMaxWidth = isFullscreen ? 2400 : 1200;

      svg.removeAttribute('width');
      svg.style.height = 'auto';
      if (isFullscreen || naturalWidth > containerWidth * 1.15) {
        const readableWidth = Math.min(Math.max(naturalWidth, Math.min(containerWidth, 960), 720), wideMaxWidth);
        graphDiv.classList.add('is-wide');
        graphDiv.style.setProperty('--mermaid-svg-width', `${readableWidth}px`);
        graphDiv.dataset.baseWidth = `${readableWidth}`;
        svg.style.width = `${readableWidth}px`;
        svg.style.maxWidth = 'none';
      } else {
        graphDiv.classList.remove('is-wide');
        graphDiv.style.removeProperty('--mermaid-svg-width');
        svg.style.width = '100%';
        svg.style.maxWidth = '100%';
        graphDiv.dataset.baseWidth = `${containerWidth}`;
      }
      graphDiv.dataset.scale = '1';

      requestAnimationFrame(() => {
        const svgHeight = svg.getBoundingClientRect().height;
        if (svgHeight > Math.min(window.innerHeight * 0.72, 760)) {
          graphDiv.classList.add('is-tall');
        } else {
          graphDiv.classList.remove('is-tall');
        }
      });
    }

    createDiagramPanel(graphDiv) {
      const panel = document.createElement('div');
      panel.className = 'mermaid-panel';

      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar';
      const fullscreenButton = this.createToolButton('全屏查看', 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3', () => this.toggleFullscreen(panel, graphDiv));
      toolbar.append(
        this.createToolButton('放大流程图', 'M12 5v14M5 12h14', () => this.zoomDiagram(graphDiv, 1.18)),
        this.createToolButton('缩小流程图', 'M5 12h14', () => this.zoomDiagram(graphDiv, 1 / 1.18)),
        this.createToolButton('适应宽度', 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3', () => this.fitDiagram(graphDiv)),
        fullscreenButton,
        this.createToolButton('复制源码', 'M8 7h8M8 11h8M8 15h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2', (button) => this.copyDiagramSource(graphDiv, button))
      );

      panel.fullscreenButton = fullscreenButton;
      graphDiv.title = '点击全屏查看';
      graphDiv.setAttribute('role', 'button');
      graphDiv.setAttribute('tabindex', '0');
      graphDiv.addEventListener('click', () => {
        if (!panel.classList.contains('is-fullscreen')) {
          this.openFullscreen(panel, graphDiv);
        }
      });
      graphDiv.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.openFullscreen(panel, graphDiv);
        }
      });

      panel.append(toolbar, graphDiv);
      return panel;
    }

    createToolButton(label, path, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mermaid-tool';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.innerHTML = iconSvg(path);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick(button);
      });
      return button;
    }

    zoomDiagram(graphDiv, factor) {
      const currentScale = Number(graphDiv.dataset.scale || '1');
      const isFullscreen = graphDiv.closest('.mermaid-panel.is-fullscreen');
      const maxScale = isFullscreen ? 4 : 2.4;
      const minScale = isFullscreen ? 0.35 : 0.55;
      const nextScale = Math.min(maxScale, Math.max(minScale, currentScale * factor));
      const baseWidth = Number(graphDiv.dataset.baseWidth || graphDiv.clientWidth || 960);
      graphDiv.dataset.scale = `${nextScale}`;
      graphDiv.classList.add('is-wide');
      const nextWidth = Math.round(baseWidth * nextScale);
      graphDiv.style.setProperty('--mermaid-svg-width', `${nextWidth}px`);
      const svg = graphDiv.querySelector('svg');
      if (svg) {
        svg.style.width = `${nextWidth}px`;
        svg.style.maxWidth = 'none';
      }
    }

    toggleFullscreen(panel, graphDiv) {
      if (panel.classList.contains('is-fullscreen')) {
        this.closeFullscreen(panel, graphDiv);
      } else {
        this.openFullscreen(panel, graphDiv);
      }
    }

    openFullscreen(panel, graphDiv) {
      if (this.activeFullscreen && this.activeFullscreen.panel !== panel) {
        this.closeFullscreen(this.activeFullscreen.panel, this.activeFullscreen.graphDiv, { skipBrowserExit: true });
      }
      this.movePanelToBody(panel);
      panel.classList.add('is-fullscreen');
      document.body.classList.add('mermaid-fullscreen');
      graphDiv.title = '使用工具栏缩放，按 Esc 退出';
      this.activeFullscreen = { panel, graphDiv };
      this.syncFullscreenButton(panel, true);
      if (panel.requestFullscreen && document.fullscreenElement !== panel) {
        panel.requestFullscreen().catch(() => {});
      }
      requestAnimationFrame(() => this.fitDiagram(graphDiv));
    }

    closeFullscreen(panel, graphDiv, options = {}) {
      panel.classList.remove('is-fullscreen');
      document.body.classList.remove('mermaid-fullscreen');
      graphDiv.title = '点击全屏查看';
      if (this.activeFullscreen && this.activeFullscreen.panel === panel) {
        this.activeFullscreen = null;
      }
      this.syncFullscreenButton(panel, false);
      if (!options.skipBrowserExit && document.fullscreenElement === panel && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.restorePanel(panel);
      requestAnimationFrame(() => this.fitDiagram(graphDiv));
    }

    syncFullscreenButton(panel, isFullscreen) {
      if (!panel.fullscreenButton) return;
      const label = isFullscreen ? '退出全屏' : '全屏查看';
      panel.fullscreenButton.title = label;
      panel.fullscreenButton.setAttribute('aria-label', label);
    }

    movePanelToBody(panel) {
      if (panel.fullscreenPlaceholder || panel.parentNode === document.body) return;
      const placeholder = document.createComment('mermaid-fullscreen-placeholder');
      panel.parentNode.insertBefore(placeholder, panel);
      panel.fullscreenPlaceholder = placeholder;
      document.body.appendChild(panel);
    }

    restorePanel(panel) {
      const placeholder = panel.fullscreenPlaceholder;
      if (!placeholder) return;
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(panel, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      }
      panel.fullscreenPlaceholder = null;
    }

    bindFullscreenEvents() {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.activeFullscreen) {
          this.closeFullscreen(this.activeFullscreen.panel, this.activeFullscreen.graphDiv);
        }
      });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && this.activeFullscreen) {
          this.closeFullscreen(this.activeFullscreen.panel, this.activeFullscreen.graphDiv, { skipBrowserExit: true });
        }
      });
    }

    async copyDiagramSource(graphDiv, button) {
      const source = graphDiv.dataset.mermaidSource || '';
      if (!source || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(source);
        const oldTitle = button.title;
        button.title = '已复制';
        setTimeout(() => {
          button.title = oldTitle;
        }, 1200);
      } catch (error) {
        button.title = '复制失败';
      }
    }

    applyDiagramTypography(graphDiv) {
      const fontStack = getComputedStyle(document.documentElement).getPropertyValue('--font-mermaid').trim();
      graphDiv.querySelectorAll('svg, svg *, foreignObject, foreignObject *, .label, .label *').forEach((node) => {
        node.style.setProperty('font-family', fontStack, 'important');
      });
    }

    isMermaidBlock(block, code, text) {
      const lang = [
        block.getAttribute('lang'),
        block.getAttribute('data-lang'),
        code && code.getAttribute('lang'),
        code && code.getAttribute('data-lang'),
        code && code.className
      ].filter(Boolean).join(' ').toLowerCase();

      return lang.includes('mermaid') || this.isMermaidCode(text);
    }

    isMermaidCode(code) {
      const normalized = code.trim().toLowerCase();
      const keywords = [
        'graph ',
        'flowchart ',
        'sequencediagram',
        'classdiagram',
        'statediagram',
        'erdiagram',
        'gantt',
        'pie ',
        'journey',
        'mindmap',
        'timeline',
        'gitgraph'
      ];
      return keywords.some(keyword => normalized.startsWith(keyword));
    }
  }

  window.mermaidRenderer = new MermaidRenderer();


// The document already contains all article text; only comments require a request.
document.querySelectorAll('.load-comments').forEach(button => {
  let page = 1;
  button.addEventListener('click', async () => {
    const section = button.closest('#comments');
    const list = section.querySelector('.comments-list');
    if (button.dataset.count === '0') {
      list.textContent = '暂无评论。';
      button.hidden = true;
      return;
    }
    button.disabled = true;
    button.textContent = 'Loading…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`https://api.github.com/repos/xcouturecc/gitblog/issues/${section.dataset.issue}/comments?per_page=20&page=${page}`, { signal: controller.signal, headers: { Accept: 'application/vnd.github.full+json' } });
      if (!response.ok) throw new Error('Comments unavailable');
      const comments = await response.json();
      list.querySelector('.comments-status')?.remove();
      let commentList = list.querySelector('.comment-list');
      if (!commentList) {
        commentList = document.createElement('ul');
        commentList.className = 'comment-list';
        list.append(commentList);
      }
      for (const comment of comments) {
        const user = comment.user || {login: 'ghost', html_url: 'https://github.com/ghost'};
        const item = document.createElement('li');
        const avatarLink = document.createElement('a');
        avatarLink.className = 'author';
        avatarLink.href = user.html_url;
        if (user.avatar_url) {
          const avatar = document.createElement('img');
          avatar.src = user.avatar_url;
          avatar.alt = user.login;
          avatar.loading = 'lazy';
          avatar.width = 48;
          avatar.height = 48;
          avatarLink.append(avatar);
        }
        const panel = document.createElement('div');
        panel.className = 'comment-body';
        const author = document.createElement('a');
        author.href = user.html_url;
        author.target = '_blank';
        author.rel = 'noopener noreferrer';
        author.textContent = user.login;
        const date = document.createElement('span');
        date.textContent = ' on ' + new Date(comment.updated_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        const body = document.createElement('div');
        body.className = 'markdown-body';
        if (comment.body_html) {
          const parsed = new DOMParser().parseFromString(comment.body_html, 'text/html');
          parsed.querySelectorAll('script, style, iframe, object, embed, form, link, meta').forEach(node => node.remove());
          parsed.body.querySelectorAll('*').forEach(node => {
            for (const attribute of [...node.attributes]) {
              if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc') node.removeAttribute(attribute.name);
              if (['href', 'src', 'xlink:href'].includes(attribute.name) && !/^(https?:|mailto:|#|\/)/i.test(attribute.value.trim())) node.removeAttribute(attribute.name);
            }
          });
          body.append(...parsed.body.childNodes);
        } else {
          body.style.whiteSpace = 'pre-wrap';
          body.textContent = comment.body || '';
        }
        panel.append(author, date, body);
        item.append(avatarLink, panel);
        commentList.append(item);
        normalizeBlogImages(body);
        window.mermaidRenderer.renderMermaidDiagrams(body);
      }
      page += 1;
      button.hidden = comments.length < 20;
      button.textContent = `Load More (${Math.max(0, Number(button.dataset.count) - (page - 1) * 20)} / ${button.dataset.count})`;
      if (!comments.length && !list.children.length) list.textContent = 'No comments.';
      if (comments.length < 20 && !section.querySelector('.add-comment')) {
        const add = document.createElement('a');
        add.className = 'button add-comment';
        add.href = `https://github.com/xcouturecc/gitblog/issues/${section.dataset.issue}#new_comment_field`;
        add.target = '_blank';
        add.rel = 'noopener noreferrer';
        add.textContent = 'Add Comments';
        section.append(add);
      }
    } catch (_) {
      let status = list.querySelector('.comments-status');
      if (!status) {
        status = document.createElement('p');
        status.className = 'comments-status';
        list.append(status);
      }
      status.textContent = '评论暂时无法加载，可重试或前往 GitHub 查看。';
      button.textContent = 'Retry';
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
    }
  });
});

// Return to the list page the reader came from, as the original arrow did.
document.querySelector('#post .back')?.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!document.referrer) return;
  const previous = new URL(document.referrer);
  if (previous.origin === location.origin && (previous.pathname === '/' || /^\/page\/\d+\/$/.test(previous.pathname))) {
    event.preventDefault();
    history.back();
  }
});
