// Copy a document's identifier to the clipboard and confirm it in place.
// (Previously a Materialize tooltip; the theme no longer ships Materialize.)
document.addEventListener('DOMContentLoaded', () => {
  let timer = null;

  const confirmCopy = (button) => {
    clearTimeout(timer);
    button.classList.add('copied');
    const previous = button.getAttribute('aria-label');
    button.setAttribute('aria-label', 'Copied');
    button.setAttribute('title', 'Copied!');
    timer = setTimeout(() => {
      button.classList.remove('copied');
      button.setAttribute('aria-label', previous || 'Copy identifier');
      button.setAttribute('title', 'Copy identifier');
    }, 1200);
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.copy-reference');
    if (!button) return;
    const ref = button.parentElement.querySelector('.reference');
    if (!ref) return;
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(ref.innerText.trim())
      .then(() => confirmCopy(button))
      .catch((err) => console.error(err));
  });
});
