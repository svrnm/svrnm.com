import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.12.3/dist/mermaid.esm.min.mjs';

const MERMAID_CONFIG = {
  light: {
    theme: 'forest'
  },
  dark: {
    theme: 'dark'
  }
};

const getThemeMode = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

let renderInFlight = false;

const renderMermaid = async () => {
  if (renderInFlight) return;
  renderInFlight = true;

  const blocks = document.querySelectorAll('pre.mermaid');
  if (!blocks.length) {
    renderInFlight = false;
    return;
  }

  blocks.forEach((block) => {
    if (!block.dataset.mermaidSource) {
      block.dataset.mermaidSource = block.textContent.trim();
    }
    block.textContent = block.dataset.mermaidSource;
    block.removeAttribute('data-processed');
  });

  mermaid.initialize({
    startOnLoad: false,
    ...MERMAID_CONFIG[getThemeMode()],
    securityLevel: 'loose'
  });

  try {
    await mermaid.run({ querySelector: 'pre.mermaid' });
  } finally {
    renderInFlight = false;
  }
};

document.addEventListener('DOMContentLoaded', renderMermaid);

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
    requestAnimationFrame(() => renderMermaid());
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

document.addEventListener('click', (event) => {
  if (event.target && event.target.id === 'theme-toggle') {
    setTimeout(() => renderMermaid(), 20);
  }
});
