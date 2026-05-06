document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  if (!input) return;

  const empty = document.getElementById('search-empty');
  const docs = Array.from(document.querySelectorAll('.document'));
  const refs = docs.map((d) => {
    const ref = d.querySelector('.reference');
    return ref ? ref.textContent.trim().toLowerCase() : '';
  });

  const dividerFor = (doc) => {
    const next = doc.nextElementSibling;
    return next && next.classList.contains('divider') ? next : null;
  };

  const update = () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    for (let i = 0; i < docs.length; i++) {
      const match = !query || refs[i].indexOf(query) !== -1;
      docs[i].hidden = !match;
      const divider = dividerFor(docs[i]);
      if (divider) divider.hidden = !match;
      if (match) visible++;
    }
    if (empty) empty.hidden = !query || visible > 0;
  };

  let debounceId = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(update, 80);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      update();
    }
  });
});
