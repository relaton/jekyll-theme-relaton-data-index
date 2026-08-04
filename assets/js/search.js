document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  if (!input) return;
  const status = document.getElementById('search-status');
  const defaultArea = document.getElementById('docs-default');
  const filteredArea = document.getElementById('docs-filtered');
  if (!status || !defaultArea || !filteredArea) return;

  const searchUrl = input.dataset.searchUrl;
  const staticPageSize = Math.max(1, parseInt(input.dataset.pageSize, 10) || 100);
  const pagerWindow = 3;

  let index = null;
  let pending = null;
  let activeList = null;
  let currentPage = 1;
  let currentQuery = '';
  let rowsPerPage = computeRowsPerPage();

  function computeRowsPerPage() {
    const h = (typeof window !== 'undefined' && window.innerHeight) || 900;
    if (h < 600) return 10;
    if (h < 800) return 15;
    if (h < 1000) return 25;
    if (h < 1300) return 40;
    return 60;
  }

  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const loadIndex = () => {
    if (index) return Promise.resolve(index);
    if (pending) return pending;
    pending = fetch(searchUrl)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => { index = data; return data; })
      .catch((err) => { pending = null; throw err; });
    return pending;
  };

  // Icons inlined from _includes/copy.svg and _includes/pager.html so the
  // filtered view is pixel-identical to the server-rendered one.
  const COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="12" height="12" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  const chevron = (d) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';

  const CHEVRON_LEFT = chevron('M15 18l-6-6 6-6');
  const CHEVRON_RIGHT = chevron('M9 18l6-6-6-6');

  // Mirrors the `{% for post in paginator.posts %}` markup in index.html.
  // Any change here must be made there too, and vice versa.
  const renderRow = (doc) => {
    const t = doc.t || '';
    const s = doc.s || '';
    const d = doc.d || '';
    const u = doc.u || '#!';
    const c = doc.c || '';
    return (
      '<article class="doc-row">' +
        '<div class="doc-main">' +
          '<div class="doc-id-line">' +
            '<h2 class="reference">' + escapeHtml(doc.r) + '</h2>' +
            '<button type="button" class="copy-reference" aria-label="Copy identifier" ' +
              'title="Copy identifier">' + COPY_ICON + '</button>' +
          '</div>' +
          '<p class="doc-title">' + escapeHtml(c) + '</p>' +
        '</div>' +
        '<div class="doc-meta">' +
          (t ? '<span class="doc-type ' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>' : '') +
          (s ? '<span class="doc-stage ' + escapeHtml(s) + '">' + escapeHtml(s) + '</span>' : '') +
          (d ? '<time class="doc-date">' + escapeHtml(d) + '</time>' : '') +
          '<a class="doc-yaml" target="_blank" rel="noopener" href="' + escapeHtml(u) + '">YAML</a>' +
        '</div>' +
      '</article>'
    );
  };

  const pagerLink = (page, label, extra) => (
    '<a class="pager-item" href="#!" data-filter-page="' + page + '"' + (extra || '') + '>' + label + '</a>'
  );

  const pagerDisabled = (label) => (
    '<span class="pager-item disabled" aria-hidden="true">' + label + '</span>'
  );

  const pagerCurrent = (page) => (
    '<span class="pager-item active" aria-current="page">' + page + '</span>'
  );

  // Mirrors _includes/pager.html.
  const renderPager = (current, total) => {
    if (total <= 1) {
      if (total <= 0) return '';
      return '<nav class="pager" aria-label="Pagination">' + pagerCurrent(1) + '</nav>';
    }
    let html = '<nav class="pager" aria-label="Pagination">';

    if (current > 1) {
      html += pagerLink(current - 1, CHEVRON_LEFT, ' aria-label="Previous page"');
    } else {
      html += pagerDisabled(CHEVRON_LEFT);
    }

    const windowStart = Math.max(1, current - pagerWindow);
    const windowEnd = Math.min(total, current + pagerWindow);

    if (windowStart > 1) {
      if (current === 1) {
        html += pagerCurrent(1);
      } else {
        html += pagerLink(1, '1');
      }
      if (windowStart > 2) html += pagerDisabled('&hellip;');
    }

    for (let p = windowStart; p <= windowEnd; p++) {
      if (p === current) {
        html += pagerCurrent(p);
      } else {
        html += pagerLink(p, String(p));
      }
    }

    if (windowEnd < total) {
      if (windowEnd < total - 1) html += pagerDisabled('&hellip;');
      html += pagerLink(total, String(total));
    }

    if (current < total) {
      html += pagerLink(current + 1, CHEVRON_RIGHT, ' aria-label="Next page"');
    } else {
      html += pagerDisabled(CHEVRON_RIGHT);
    }

    html += '</nav>';
    return html;
  };

  const render = () => {
    const list = activeList;
    if (!list) return;

    if (currentQuery && list.length === 0) {
      filteredArea.innerHTML = '';
      filteredArea.hidden = true;
      defaultArea.hidden = true;
      status.hidden = false;
      status.innerHTML =
        '<div class="search-empty">No matches for &ldquo;' + escapeHtml(currentQuery) + '&rdquo;.</div>';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / rowsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * rowsPerPage;
    const slice = list.slice(start, start + rowsPerPage);
    const pager = renderPager(currentPage, totalPages);
    const rows = slice.map(renderRow).join('');
    filteredArea.innerHTML = pager + '<div class="doc-list">' + rows + '</div>' + pager;
    filteredArea.hidden = false;
    defaultArea.hidden = true;

    if (currentQuery) {
      status.hidden = false;
      status.innerHTML =
        '<div class="search-info">' +
          list.length + ' match' + (list.length === 1 ? '' : 'es') +
          ' for &ldquo;' + escapeHtml(currentQuery) + '&rdquo; — page ' +
          currentPage + ' of ' + totalPages +
        '</div>';
    } else {
      status.hidden = true;
      status.innerHTML = '';
    }
  };

  const showLoading = () => {
    status.hidden = false;
    status.innerHTML = '<div class="search-loading">Loading index&hellip;</div>';
  };

  const showError = (message) => {
    defaultArea.hidden = false;
    filteredArea.innerHTML = '';
    filteredArea.hidden = true;
    status.hidden = false;
    status.innerHTML = '<div class="search-empty">' + escapeHtml(message) + '</div>';
  };

  const initialPageFromUrl = () => {
    const m = window.location.pathname.match(/page(\d+)\/?$/);
    const staticPage = m ? Math.max(1, parseInt(m[1], 10)) : 1;
    const startIndex = (staticPage - 1) * staticPageSize;
    return Math.floor(startIndex / rowsPerPage) + 1;
  };

  const runFilter = async () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      currentQuery = '';
      activeList = index;
      if (!activeList) {
        try {
          activeList = await loadIndex();
        } catch (err) {
          showError('Index failed to load.');
          return;
        }
      }
      currentPage = initialPageFromUrl();
      render();
      return;
    }

    if (!index) showLoading();

    let data;
    try {
      data = await loadIndex();
    } catch (err) {
      console.error(err);
      showError('Index failed to load.');
      return;
    }

    const liveQuery = input.value.trim().toLowerCase();
    if (!liveQuery) {
      currentQuery = '';
      activeList = data;
      currentPage = initialPageFromUrl();
      render();
      return;
    }

    currentQuery = liveQuery;
    const matches = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const ref = row.r;
      const title = row.c;
      if ((ref && ref.toLowerCase().indexOf(liveQuery) !== -1) ||
          (title && title.toLowerCase().indexOf(liveQuery) !== -1)) {
        matches.push(row);
      }
    }
    activeList = matches;
    currentPage = 1;
    render();
  };

  // Initial render: take over from the static list as soon as the index is ready.
  showLoading();
  loadIndex()
    .then((data) => {
      activeList = data;
      currentPage = initialPageFromUrl();
      render();
    })
    .catch((err) => {
      console.error(err);
      // Leave the static fallback visible.
      defaultArea.hidden = false;
      filteredArea.hidden = true;
      status.hidden = true;
    });

  let debounceId = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(runFilter, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      runFilter();
    }
  });

  filteredArea.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-filter-page]');
    if (!link) return;
    e.preventDefault();
    const page = parseInt(link.dataset.filterPage, 10);
    if (!Number.isFinite(page)) return;
    currentPage = page;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  let resizeId = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(() => {
      const next = computeRowsPerPage();
      if (next === rowsPerPage || !activeList) return;
      const topIndex = (currentPage - 1) * rowsPerPage;
      rowsPerPage = next;
      currentPage = Math.floor(topIndex / rowsPerPage) + 1;
      render();
    }, 200);
  });
});
