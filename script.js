const root = document.documentElement;
const PROJECTS = window.PROJECTS || [];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Live local clock
const clock = document.getElementById('clock');
const tick = () => {
  clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
tick();
setInterval(tick, 15000);

// Theme toggle (remembers choice)
document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

// Mobile menu
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menu-toggle');
const setMenu = (open) => {
  nav.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// Top bar border once scrolled
const topbar = document.querySelector('.topbar');
addEventListener('scroll', () => topbar.classList.toggle('is-scrolled', scrollY > 8), { passive: true });

/* ==========================================================================
   Project list (rendered from projects.js)
   ========================================================================== */
const list = document.getElementById('projects');
list.innerHTML = PROJECTS.map((p, i) => `
  <li class="project reveal" data-slug="${p.slug}" data-color="${p.color}">
    <a href="#/work/${p.slug}" class="project__link">
      <span class="project__num mono">${pad(i + 1)}</span>
      <span class="project__title">${esc(p.title)}</span>
      <span class="project__desc">${esc(p.summary)}</span>
      <span class="project__tags mono">${p.tags.map(esc).join(' · ')}</span>
      <span class="project__year mono">${esc(p.year)}</span>
      <span class="project__arrow" aria-hidden="true">→</span>
    </a>
  </li>`).join('');
document.getElementById('project-count').textContent = `(${pad(PROJECTS.length)})`;

list.addEventListener('click', (e) => {
  const link = e.target.closest('.project__link');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  openCase(link.parentElement.dataset.slug, { push: true });
});

/* ==========================================================================
   Reveal on scroll + active nav link
   ========================================================================== */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const links = [...nav.querySelectorAll('a')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

/* ==========================================================================
   Missing images → labeled placeholder showing where the file should go
   ========================================================================== */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('.shot')) return;
  img.closest('.shot').classList.add('is-missing');
}, true);

const shot = (img, index, extra = '') => `
  <figure class="shot ${extra}" data-index="${index}">
    <button class="shot__btn" type="button" aria-label="Enlarge image" data-path="${esc(img.src)}">
      <img src="${esc(img.src)}" alt="${esc(img.alt || img.caption || '')}" loading="lazy" decoding="async">
    </button>
    ${img.caption ? `<figcaption class="mono">${esc(img.caption)}</figcaption>` : ''}
  </figure>`;

/* ==========================================================================
   Case study dialog
   ========================================================================== */
const caseEl = document.getElementById('case');
const caseBody = document.getElementById('case-body');
const caseScroll = document.getElementById('case-scroll');
const casePos = document.getElementById('case-pos');
let current = -1;
let pushedHistory = false;
let lastFocus = null;

function renderCase(i) {
  const p = PROJECTS[i];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const images = [p.cover, ...(p.gallery || [])].filter(Boolean);
  let n = 0;
  const st = () => `style="--i:${n++}"`;

  caseEl.style.setProperty('--project', p.color);
  casePos.textContent = `${pad(i + 1)} / ${pad(PROJECTS.length)}`;
  caseBody.innerHTML = `
    <header class="case__head">
      <p class="mono muted" ${st()}>${pad(i + 1)} — ${esc(p.year)}</p>
      <h1 class="case__title" id="case-title" ${st()}>${esc(p.title)}</h1>
      <p class="case__summary" ${st()}>${esc(p.summary)}</p>
      <dl class="case__meta" ${st()}>
        <div><dt class="mono">Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt class="mono">Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt class="mono">Stack</dt><dd>${p.stack.map(esc).join(', ')}</dd></div>
        <div><dt class="mono">Links</dt><dd class="case__links">${p.links.map((l) =>
          `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</dd></div>
      </dl>
    </header>

    ${p.cover ? `<div ${st()}>${shot(p.cover, 0, 'shot--cover')}</div>` : ''}

    <section class="case__section" ${st()}>
      <h2 class="mono label">Overview</h2>
      <p class="case__lead">${esc(p.overview)}</p>
    </section>

    <section class="case__section" ${st()}>
      <h2 class="mono label">What I built</h2>
      <ol class="built">${p.built.map((b) => `<li>${esc(b)}</li>`).join('')}</ol>
    </section>

    ${p.gallery?.length ? `
    <section class="case__section case__section--wide">
      <h2 class="mono label">Screens</h2>
      <div class="gallery">${p.gallery.map((g, k) => shot(g, k + (p.cover ? 1 : 0))).join('')}</div>
    </section>` : ''}

    <section class="case__section">
      <h2 class="mono label">Outcome</h2>
      <p class="case__lead">${esc(p.outcome)}</p>
    </section>

    <a class="case__next" href="#/work/${next.slug}" data-goto="${next.slug}" style="--next:${next.color}">
      <span class="mono muted">Next project</span>
      <span class="case__next-title">${esc(next.title)} <span aria-hidden="true">→</span></span>
    </a>`;

  caseBody.dataset.images = JSON.stringify(images);
  caseScroll.scrollTop = 0;
  current = i;
}

function openCase(slug, { push = false, replace = false } = {}) {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  if (i < 0) return;
  hidePreview();
  if (push) { history.pushState({ case: slug }, '', `#/work/${slug}`); pushedHistory = true; }
  else if (replace) history.replaceState({ case: slug }, '', `#/work/${slug}`);

  if (caseEl.open) {
    // Switching projects: quick cross-fade
    caseBody.classList.add('is-switching');
    setTimeout(() => { renderCase(i); caseBody.classList.remove('is-switching'); }, reduced ? 0 : 180);
    return;
  }
  lastFocus = document.activeElement;
  renderCase(i);
  root.classList.add('no-scroll');
  caseEl.classList.remove('is-closing');
  caseEl.showModal();
  caseEl.querySelector('.case__close').focus({ preventScroll: true });
}

function hideCase() {
  if (!caseEl.open) return;
  caseEl.classList.add('is-closing');
  setTimeout(() => {
    caseEl.close();
    caseEl.classList.remove('is-closing');
    root.classList.remove('no-scroll');
    const row = list.querySelector(`[data-slug="${PROJECTS[current]?.slug}"] .project__link`);
    (row || lastFocus)?.focus({ preventScroll: true });
    current = -1;
  }, reduced ? 0 : 280);
}

function requestClose() {
  if (pushedHistory) { pushedHistory = false; history.back(); }   // popstate will hide it
  else { history.replaceState(null, '', '#work'); hideCase(); }
}

const step = (dir) => openCase(PROJECTS[(current + dir + PROJECTS.length) % PROJECTS.length].slug, { replace: true });
document.getElementById('case-prev').addEventListener('click', () => step(-1));
document.getElementById('case-next').addEventListener('click', () => step(1));

caseEl.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
caseEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return requestClose();
  const goto = e.target.closest('[data-goto]');
  if (goto) { e.preventDefault(); return openCase(goto.dataset.goto, { replace: true }); }
  const s = e.target.closest('.shot:not(.is-missing) .shot__btn');
  if (s) openLightbox(+s.parentElement.dataset.index);
});
caseEl.addEventListener('keydown', (e) => {
  if (lightbox.open) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

// Reading progress bar in the case header
caseScroll.addEventListener('scroll', () => {
  const max = caseScroll.scrollHeight - caseScroll.clientHeight;
  caseEl.style.setProperty('--progress', max > 0 ? caseScroll.scrollTop / max : 0);
}, { passive: true });

// Routing: #/work/<slug> opens a case study (deep-linkable, back button closes it)
function route() {
  const m = location.hash.match(/^#\/work\/([\w-]+)/);
  if (m) openCase(m[1]);
  else { pushedHistory = false; hideCase(); }
}
addEventListener('popstate', route);

/* ==========================================================================
   Lightbox
   ========================================================================== */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
let lbItems = [];
let lbIndex = 0;

function openLightbox(index) {
  const all = JSON.parse(caseBody.dataset.images || '[]');
  const missing = new Set([...caseBody.querySelectorAll('.shot.is-missing')].map((f) => +f.dataset.index));
  lbItems = all.map((img, k) => ({ ...img, k })).filter((img) => !missing.has(img.k));
  lbIndex = Math.max(0, lbItems.findIndex((img) => img.k === index));
  showLightboxImage();
  lightbox.showModal();
}
function showLightboxImage() {
  const img = lbItems[lbIndex];
  if (!img) return;
  lbImg.src = img.src;
  lbImg.alt = img.alt || img.caption || '';
  lbCap.textContent = `${lbIndex + 1} / ${lbItems.length}${img.caption ? ' — ' + img.caption : ''}`;
  lightbox.classList.toggle('is-single', lbItems.length < 2);
}
const lbStep = (dir) => { lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length; showLightboxImage(); };

document.getElementById('lb-prev').addEventListener('click', () => lbStep(-1));
document.getElementById('lb-next').addEventListener('click', () => lbStep(1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close();
});
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') lbStep(1);
  if (e.key === 'ArrowLeft') lbStep(-1);
});
let touchX = null;
lightbox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
  touchX = null;
});

/* ==========================================================================
   Cursor-following project preview (pointer devices only)
   Shows the project's cover image if it exists, otherwise its color.
   ========================================================================== */
const preview = document.getElementById('preview');
const label = document.getElementById('preview-label');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const coverOk = {};
function hidePreview() {
  preview.classList.remove('is-visible');
  preview.style.transform = '';
}

PROJECTS.forEach((p) => {
  if (!p.cover) return;
  const im = new Image();
  im.onload = () => { coverOk[p.slug] = p.cover.src; };
  im.src = p.cover.src;
});

if (finePointer) {
  let x = 0, y = 0, px = 0, py = 0, raf = null;
  const follow = () => {
    px += (x - px) * (reduced ? 1 : 0.18);
    py += (y - py) * (reduced ? 1 : 0.18);
    preview.style.translate = `${px}px ${py}px`;
    raf = Math.abs(x - px) + Math.abs(y - py) > 0.5 ? requestAnimationFrame(follow) : null;
  };
  addEventListener('mousemove', (e) => {
    x = e.clientX + 40; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(follow);
  });

  list.querySelectorAll('.project').forEach((p) => {
    p.addEventListener('mouseenter', () => {
      if (caseEl.open) return;
      const src = coverOk[p.dataset.slug];
      preview.style.setProperty('--preview-color', p.dataset.color);
      preview.style.backgroundImage = src ? `url("${src}")` : '';
      preview.classList.toggle('has-image', !!src);
      label.textContent = p.querySelector('.project__title').textContent;
      preview.classList.add('is-visible');
      preview.style.transform = 'translate(0, -50%) scale(1)';
    });
    p.addEventListener('mouseleave', hidePreview);
  });
}

// Open a case study if the page loaded with #/work/<slug>
route();
