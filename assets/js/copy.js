document.addEventListener('DOMContentLoaded', () => {
  const opts = {html: 'Copied!', position: 'top'};
  const showTooltip = (tooltip) => {
    tooltip.open();
    setTimeout(() => {
      tooltip.close();
      tooltip.destroy();
    }, 1000);
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.copy-reference');
    if (!button) return;
    const ref = button.parentElement.querySelector('.reference');
    if (!ref) return;
    const tooltip = M.Tooltip.init(button, opts);
    showTooltip(tooltip);
    navigator.clipboard.writeText(ref.innerText);
  });
});
