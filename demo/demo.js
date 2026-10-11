// Shared behaviour for the live demos: theme switch and entrance motion.
(() => {
  const root = document.documentElement;

  // Theme: Auto / Light / Dark, same saved preference as the portfolio
  const buttons = [...document.querySelectorAll('[data-theme-choice]')];
  function apply(choice) {
    if (choice === 'light' || choice === 'dark') root.dataset.theme = choice;
    else delete root.dataset.theme;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
  }
  let saved = 'auto';
  try { saved = localStorage.getItem('theme') || 'auto'; } catch (e) {}
  apply(saved);
  buttons.forEach((b) => b.addEventListener('click', () => {
    const choice = b.dataset.themeChoice;
    apply(choice);
    try {
      choice === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', choice);
      // The ExchangeLab dashboard keeps its own key; keep it in step
      if (localStorage.getItem('exchangelab.theme') !== null || document.body.dataset.app === 'exchangelab') {
        choice === 'auto' ? localStorage.removeItem('exchangelab.theme') : localStorage.setItem('exchangelab.theme', choice);
      }
    } catch (e) {}
  }));

  // Entrance: reveal [data-rise] elements in sequence once fonts are ready
  const rise = () => document.querySelectorAll('[data-rise]').forEach((el) => el.classList.add('is-in'));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(rise));
})();
