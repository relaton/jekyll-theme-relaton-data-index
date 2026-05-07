document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  if (!input) return;
  const status = document.getElementById('search-status');
  const defaultArea = document.getElementById('docs-default');
  const filteredArea = document.getElementById('docs-filtered');
  if (!status || !defaultArea || !filteredArea) return;

  const searchUrl = input.dataset.searchUrl;
  const pageSize = Math.max(1, parseInt(input.dataset.pageSize, 10) || 100);
  const pagerWindow = 3;

  let index = null;
  let pending = null;
  let matches = [];
  let currentPage = 1;
  let currentQuery = '';

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
    if (total <= 0) return '';
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

  const renderResults = () => {
    if (!matches.length) {
      filteredArea.innerHTML = '';
      filteredArea.hidden = true;
      defaultArea.hidden = true;
      status.hidden = false;
      status.innerHTML =
        '<div class="search-empty">No matches for &ldquo;' + escapeHtml(currentQuery) + '&rdquo;.</div>';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const slice = matches.slice(start, start + pageSize);

    const pager = renderPager(currentPage, totalPages);
    const rows = slice.map(renderRow).join('');
    filteredArea.innerHTML = pager + rows + pager;
    filteredArea.hidden = false;
    defaultArea.hidden = true;

    status.hidden = false;
    status.innerHTML =
      '<div class="search-info">' +
        matches.length + ' match' + (matches.length === 1 ? '' : 'es') +
        ' for &ldquo;' + escapeHtml(currentQuery) + '&rdquo; — page ' +
        currentPage + ' of ' + totalPages +
      '</div>';
  };

  const showDefault = () => {
    filteredArea.innerHTML = '';
    filteredArea.hidden = true;
    defaultArea.hidden = false;
    status.hidden = true;
    status.innerHTML = '';
  };

  const showLoading = () => {
    defaultArea.hidden = true;
    filteredArea.innerHTML = '';
    filteredArea.hidden = true;
    status.hidden = false;
    status.innerHTML = '<div class="search-loading">Loading search index&hellip;</div>';
  };

  const showError = (message) => {
    defaultArea.hidden = true;
    filteredArea.innerHTML = '';
    filteredArea.hidden = true;
    status.hidden = false;
    status.innerHTML = '<div class="search-empty">' + escapeHtml(message) + '</div>';
  };

  const runFilter = async () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      currentQuery = '';
      matches = [];
      currentPage = 1;
      showDefault();
      return;
    }

    if (!index) showLoading();

    let data;
    try {
      data = await loadIndex();
    } catch (err) {
      console.error(err);
      showError('Search index failed to load.');
      return;
    }

    const liveQuery = input.value.trim().toLowerCase();
    if (!liveQuery) {
      showDefault();
      return;
    }

    currentQuery = liveQuery;
    matches = [];
    for (let i = 0; i < data.length; i++) {
      const ref = data[i].r;
      if (ref && ref.toLowerCase().indexOf(liveQuery) !== -1) matches.push(data[i]);
    }
    currentPage = 1;
    renderResults();
  };

  let debounceId = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(runFilter, 120);
  });
  input.addEventListener('focus', () => { loadIndex().catch(() => {}); });
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
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
