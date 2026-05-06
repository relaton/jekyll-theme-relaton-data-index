document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  const searchUrl = input.dataset.searchUrl;
  const maxResults = 50;

  let index = null;
  let pending = null;

  const loadIndex = () => {
    if (index) return Promise.resolve(index);
    if (pending) return pending;
    pending = fetch(searchUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load search index: ' + response.status);
        }
        return response.json();
      })
      .then((data) => { index = data; return data; })
      .catch((err) => { pending = null; throw err; });
    return pending;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const render = (matches, total) => {
    if (!matches.length) {
      results.innerHTML = '<div class="search-empty">No matches</div>';
    } else {
      const items = matches.map((m) => (
        '<a class="search-result" href="' + escapeHtml(m.u) + '" target="_blank">' +
          '<span class="search-result-ref">' + escapeHtml(m.r) + '</span>' +
        '</a>'
      ));
      let html = items.join('');
      if (total > matches.length) {
        html += '<div class="search-more">Showing ' + matches.length + ' of ' + total + ' matches. Refine your query.</div>';
      }
      results.innerHTML = html;
    }
    results.hidden = false;
  };

  const update = async () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }
    try {
      const data = await loadIndex();
      let total = 0;
      const matches = [];
      for (let i = 0; i < data.length; i++) {
        const ref = data[i].r;
        if (ref && ref.toLowerCase().indexOf(query) !== -1) {
          total++;
          if (matches.length < maxResults) matches.push(data[i]);
        }
      }
      render(matches, total);
    } catch (err) {
      results.innerHTML = '<div class="search-empty">Search unavailable</div>';
      results.hidden = false;
      console.error(err);
    }
  };

  let debounceId = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(update, 120);
  });
  input.addEventListener('focus', () => { loadIndex().catch(() => {}); });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.hidden = true;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.hidden = true;
      input.blur();
    }
  });
});
