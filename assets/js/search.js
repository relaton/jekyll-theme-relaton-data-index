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

  const renderRow = (doc) => {
    const t = doc.t || '';
    const s = doc.s || '';
    const d = doc.d || '';
    const u = doc.u || '#!';
    const c = doc.c || '';
    return (
      '<div class="document row">' +
        '<div class="col s12 l7">' +
          '<h4 class="reference" style="display: inline-block;">' + escapeHtml(doc.r) + '</h4>' +
          '<i class="tiny material-icons copy-reference deep-purple-text lighten-1-text" style="cursor: pointer;">content_copy</i>' +
        '</div>' +
        '<div class="col s12 l5">' +
          '<div class="doc-type ' + escapeHtml(t) + '">' + escapeHtml(t) + '</div>' +
          '<div class="doc-stage">' + escapeHtml(s) + '</div>' +
          '<div class="doc-dates">' +
            (d ? '<div class="doc-updated">(' + escapeHtml(d) + ')</div>' : '') +
          '</div>' +
          '<div class="right">' +
            '<a target="_blank" href="' + escapeHtml(u) + '">YAML</a>' +
          '</div>' +
        '</div>' +
        '<div class="col s12">' +
          '<h5>' + escapeHtml(c) + '</h5>' +
        '</div>' +
      '</div>' +
      '<div class="divider"></div>'
    );
  };

  const pagerLink = (page, label, classes) => (
    '<li class="' + classes + '">' +
      '<a href="#!" data-filter-page="' + page + '">' + label + '</a>' +
    '</li>'
  );

  const pagerDisabled = (label) => (
    '<li class="disabled"><a href="#!">' + label + '</a></li>'
  );

  const renderPager = (current, total) => {
    if (total <= 1) {
      if (total <= 0) return '';
      return '<div class="center-align"><ul class="pagination">' +
        '<li class="active"><a href="#!">1</a></li>' +
        '</ul></div>';
    }
    let html = '<div class="center-align"><ul class="pagination">';

    if (current > 1) {
      html += pagerLink(current - 1, '<i class="material-icons">chevron_left</i>', 'waves-effect');
    } else {
      html += pagerDisabled('<i class="material-icons">chevron_left</i>');
    }

    const windowStart = Math.max(1, current - pagerWindow);
    const windowEnd = Math.min(total, current + pagerWindow);

    if (windowStart > 1) {
      if (current === 1) {
        html += '<li class="active"><a href="#!">1</a></li>';
      } else {
        html += pagerLink(1, '1', 'waves-effect');
      }
      if (windowStart > 2) html += pagerDisabled('&hellip;');
    }

    for (let p = windowStart; p <= windowEnd; p++) {
      if (p === current) {
        html += '<li class="active"><a href="#!">' + p + '</a></li>';
      } else {
        html += pagerLink(p, String(p), 'waves-effect');
      }
    }

    if (windowEnd < total) {
      if (windowEnd < total - 1) html += pagerDisabled('&hellip;');
      html += pagerLink(total, String(total), 'waves-effect');
    }

    if (current < total) {
      html += pagerLink(current + 1, '<i class="material-icons">chevron_right</i>', 'waves-effect');
    } else {
      html += pagerDisabled('<i class="material-icons">chevron_right</i>');
    }

    html += '</ul></div>';
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
    filteredArea.innerHTML = pager + rows + pager;
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
      const ref = data[i].r;
      if (ref && ref.toLowerCase().indexOf(liveQuery) !== -1) matches.push(data[i]);
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
