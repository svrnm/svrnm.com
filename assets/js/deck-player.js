// Switch between live slides and a video in a {{< deck >}} shortcode.
// See layouts/shortcodes/deck.html.
(function () {
  function init(player) {
    var buttons = player.querySelectorAll('.deck-player__switch [data-view]');
    var iframe = player.querySelector('[data-panel="slides"] iframe');
    var video = player.querySelector('[data-panel="video"] video');

    function show(view, fromUser) {
      player.dataset.view = view;
      buttons.forEach(function (b) {
        b.setAttribute('aria-selected', String(b.dataset.view === view));
      });
      if (view === 'slides') {
        video.pause();
        // Load the deck on first view only.
        if (iframe.dataset.src) {
          iframe.src = iframe.dataset.src;
          delete iframe.dataset.src;
        }
        // Focus the deck so the arrow keys work right away.
        if (fromUser) iframe.focus();
      } else if (fromUser) {
        video.play().catch(function () {});
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.view, true); });
    });
    player.querySelector('.deck-player__switch').hidden = false;
    player.classList.add('is-ready');
    show(player.dataset.view, false);
  }

  document.querySelectorAll('.deck-player').forEach(init);
})();
