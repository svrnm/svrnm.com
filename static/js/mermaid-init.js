import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';

const getMermaidTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';

const renderMermaid = async () => {
  const blocks = document.querySelectorAll('pre.mermaid');
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const source = block.dataset.mermaidSource || block.textContent;
    block.textContent = source;
  });

  mermaid.initialize({
    startOnLoad: false,
    theme: getMermaidTheme(),
    securityLevel: 'loose'
  });

  await mermaid.run({ querySelector: 'pre.mermaid' });
};

document.addEventListener('DOMContentLoaded', renderMermaid);

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
    renderMermaid();
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
