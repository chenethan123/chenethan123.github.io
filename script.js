const root = document.documentElement;
const PROJECTS = window.PROJECTS || [];
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reducedQuery.matches;
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Responsive sources generated next to each PNG (800w and 1400w WebP)
const srcset = (src) => src.endsWith('.png') ? `${src.slice(0, -4)}-800.webp 800w, ${src.slice(0, -4)}-1400.webp 1400w, ${src} 2000w` : '';
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="icons.svg#i-${name}"/></svg>`;

document.getElementById('year').textContent = new Date().getFullYear();

/* ==========================================================================
   Theme: Auto (system) / Light / Dark, remembered per browser
   ========================================================================== */
const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') root.dataset.theme = choice;
  else delete root.dataset.theme;
  themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
}
let savedTheme = 'auto';
try { savedTheme = localStorage.getItem('theme') || 'auto'; } catch (e) {}
applyTheme(savedTheme);
themeButtons.forEach((b) => b.addEventListener('click', () => {
  const choice = b.dataset.themeChoice;
  applyTheme(choice);
  try { choice === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', choice); } catch (e) {}
}));

/* ==========================================================================
   Local time: mine (Eastern) and the visitor's, with the hour difference
   ========================================================================== */
const MY_ZONE = 'America/New_York';
const yourZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeFmt = (zone) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: zone });
// Short zone name (EDT, PST); where there isn't one ("GMT+1"), use the city instead
function zoneName(zone, d) {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || '';
  if (!/^(GMT|UTC)[+-]/.test(short)) return short;
  const city = zone.split('/').pop().replace(/_/g, ' ');
  // Browsers still report a few old zone IDs
  return ({ Calcutta: 'Kolkata', Saigon: 'Ho Chi Minh City', Kiev: 'Kyiv', Rangoon: 'Yangon', Katmandu: 'Kathmandu' })[city] || city;
}
// Minutes east of UTC for a zone at a given moment (handles daylight saving)
function offsetMinutes(zone, d) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(d).map((p) => [p.type, +p.value]));
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - d.getTime()) / 60000);
}
function describeDiff(minutes) {
  if (minutes === 0) return 'Same time as me';
  const abs = Math.abs(minutes), h = Math.floor(abs / 60), m = abs % 60;
  const amount = [h && `${h} ${h === 1 ? 'hour' : 'hours'}`, m && `${m} min`].filter(Boolean).join(' ');
  return `${amount} ${minutes > 0 ? 'ahead of' : 'behind'} me`;
}
const clocks = document.getElementById('clocks');
if (clocks && yourZone) {
  const els = ['clock-mine', 'zone-mine', 'clock-yours', 'zone-yours', 'clock-diff'].map((id) => document.getElementById(id));
  const [mine, mineZone, yours, yoursZone, diff] = els;
  const mineFmt = timeFmt(MY_ZONE), yoursFmt = timeFmt(yourZone);
  const tick = () => {
    const now = new Date();
    mine.textContent = mineFmt.format(now);
    mine.dateTime = now.toISOString();
    mineZone.textContent = zoneName(MY_ZONE, now);
    yours.textContent = yoursFmt.format(now);
    yours.dateTime = now.toISOString();
    yoursZone.textContent = zoneName(yourZone, now);
    diff.textContent = describeDiff(offsetMinutes(yourZone, now) - offsetMinutes(MY_ZONE, now));
  };
  tick();
  clocks.hidden = false;
  // Update on each minute boundary
  setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000) + 50);
}

/* ==========================================================================
   Mobile menu
   ========================================================================== */
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menu-toggle');
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  root.classList.toggle('no-scroll', open);
  document.getElementById('main').inert = open;
  if (open) menu.querySelector('a').focus({ preventScroll: true });
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
});

/* Nav gains a shadow once the page scrolls (observer, no scroll listener) */
const navShell = document.querySelector('.nav-shell');
const sentinel = document.createElement('div');
sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => navShell.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

/* ==========================================================================
   Work grid (rendered from projects.js)
   ========================================================================== */
const list = document.getElementById('projects');
list.innerHTML = PROJECTS.map((p, i) => `
  <li data-reveal style="--i:${i % 2}">
    <a class="tile" href="#/work/${esc(p.slug)}" data-slug="${esc(p.slug)}">
      <span class="frame"><span class="frame__img">
        <img src="${esc(p.cover.src)}" srcset="${srcset(p.cover.src)}" sizes="(max-width: 768px) 100vw, 680px" alt="${esc(p.cover.alt)}" width="${p.cover.w || 2000}" height="${p.cover.h || 1000}" loading="lazy" decoding="async">
      </span></span>
      <span class="project__body">
        <span class="tile__meta">
          <span class="tile__title">${esc(p.title)} ${icon('arrow-up-right')}</span>
          <span class="mono muted">${esc(p.year)}</span>
        </span>
        <span class="project__summary">${esc(p.summary)}</span>
        <span class="project__tags mono">${p.tags.map(esc).join(', ')}</span>
      </span>
    </a>
  </li>`).join('');

/* ==========================================================================
   Reveal on scroll + current section in the nav
   ========================================================================== */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

const navLinks = [...document.querySelectorAll('.nav__links a')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((l) => {
      if (l.getAttribute('href') === '#' + e.target.id) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

/* Missing images show where the file should go */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('.shot')) return;
  const shot = img.closest('.shot');
  shot.classList.add('is-missing');
  shot.querySelector('.frame__img').dataset.path = img.getAttribute('src');
}, true);

const shotHTML = (img, index, extra = '') => `
  <figure class="shot ${extra}" data-index="${index}">
    <button class="shot__btn" type="button" aria-label="Enlarge: ${esc(img.alt || img.caption || 'image')}">
      <span class="frame"><span class="frame__img">
        <img src="${esc(img.src)}" srcset="${srcset(img.src)}" sizes="(max-width: 1200px) 100vw, 1140px" alt="${esc(img.alt || img.caption || '')}" width="${img.w || 2000}" height="${img.h || 1250}" loading="lazy" decoding="async">
      </span></span>
    </button>
    ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}
  </figure>`;

/* ==========================================================================
   Case study dialog. Opens from the tile that was clicked and closes back
   toward it; transitions retarget from their current value if interrupted.
   ========================================================================== */
const caseEl = document.getElementById('case');
const caseBody = document.getElementById('case-body');
const caseScroll = document.getElementById('case-scroll');
let current = -1;
let pushedHistory = false;
let lastFocus = null;
let closeTimer = null;

function renderCase(i) {
  const p = PROJECTS[i];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const images = [p.cover, ...(p.gallery || [])].filter(Boolean);
  let n = 0;
  const st = () => `style="--i:${n++}"`;

  caseBody.innerHTML = `
    <header class="case__head" ${st()}>
      <p class="case__kicker mono">${esc(p.year)}, ${p.tags.map(esc).join(', ')}</p>
      <h1 class="case__title" id="case-title">${esc(p.title)}</h1>
      <p class="case__summary">${esc(p.summary)}</p>
      <dl class="case__meta">
        <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>Stack</dt><dd>${p.stack.map(esc).join(', ')}</dd></div>
        <div><dt>Links</dt><dd class="case__links">${p.links.map((l) =>
          `<a class="text-link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ${icon('arrow-up-right')}</a>`).join('')}</dd></div>
      </dl>
    </header>

    ${p.cover ? `<div ${st()}>${shotHTML(p.cover, 0, 'shot--cover')}</div>` : ''}

    <section class="case__section" ${st()}>
      <h2 class="case__h">Overview</h2>
      <p class="case__lead">${esc(p.overview)}</p>
    </section>

    <section class="case__section" ${st()}>
      <h2 class="case__h">What I built</h2>
      <ul class="built">${p.built.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </section>

    ${p.gallery?.length ? `
    <section class="case__section case__section--wide" ${st()}>
      <h2 class="case__h">Screens</h2>
      <div class="gallery">${p.gallery.map((g, k) => shotHTML(g, k + (p.cover ? 1 : 0))).join('')}</div>
    </section>` : ''}

    <section class="case__section" ${st()}>
      <h2 class="case__h">Outcome</h2>
      <p class="case__lead">${esc(p.outcome)}</p>
    </section>

    <a class="case__next" href="#/work/${esc(next.slug)}" data-goto="${esc(next.slug)}" ${st()}>
      <span class="case__next-label">Next project</span>
      <span class="case__next-title">${esc(next.title)} ${icon('arrow-right')}</span>
    </a>`;

  caseBody.dataset.images = JSON.stringify(images);
  caseScroll.scrollTop = 0;
  current = i;
}

function setOrigin(x, y) {
  caseEl.style.setProperty('--ox', `${x}px`);
  caseEl.style.setProperty('--oy', `${y}px`);
}

function openCase(slug, { push = false, replace = false, origin = null } = {}) {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  if (i < 0) return;
  if (push) { history.pushState({ case: slug }, '', `#/work/${slug}`); pushedHistory = true; }
  else if (replace) history.replaceState({ case: slug }, '', `#/work/${slug}`);

  if (caseEl.open && !caseEl.classList.contains('is-closing')) {
    // Switching projects inside the dialog: quick cross-fade
    caseBody.classList.add('is-switching');
    setTimeout(() => { renderCase(i); caseBody.classList.remove('is-switching'); }, reduced() ? 0 : 180);
    return;
  }
  clearTimeout(closeTimer);
  if (origin) setOrigin(origin.x, origin.y);
  else setOrigin(innerWidth / 2, innerHeight / 3);
  if (!caseEl.open) {
    lastFocus = document.activeElement;
    renderCase(i);
    caseEl.classList.add('is-entering');
    caseEl.showModal();
    root.classList.add('no-scroll');
    caseEl.querySelector('[data-close]').focus({ preventScroll: true });
    caseEl.getBoundingClientRect(); // commit the start state so the transition runs
  } else {
    renderCase(i);
  }
  caseEl.classList.remove('is-entering', 'is-closing');
}

function hideCase() {
  if (!caseEl.open || caseEl.classList.contains('is-closing')) return;
  // Close back toward the tile this project lives in
  const tile = list.querySelector(`[data-slug="${PROJECTS[current]?.slug}"]`);
  if (tile) {
    const r = tile.getBoundingClientRect();
    setOrigin(r.left + r.width / 2, Math.min(Math.max(r.top + r.height / 2, 0), innerHeight));
  }
  caseEl.classList.add('is-closing');
  closeTimer = setTimeout(() => {
    caseEl.close();
    caseEl.classList.remove('is-closing');
    root.classList.remove('no-scroll');
    (tile || lastFocus)?.focus({ preventScroll: true });
    current = -1;
  }, reduced() ? 200 : 320);
}

function requestClose() {
  if (pushedHistory) { pushedHistory = false; history.back(); } // popstate hides it
  else { history.replaceState(null, '', '#work'); hideCase(); }
}

document.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile[data-slug]');
  if (!tile || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const r = tile.getBoundingClientRect();
  openCase(tile.dataset.slug, { push: true, origin: { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 } });
});

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
  if (lightbox.open || e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

// Routing: #/work/<slug> opens a case study (deep-linkable; Back closes it)
function route() {
  const m = location.hash.match(/^#\/work\/([\w-]+)/);
  if (m) openCase(m[1]);
  else { pushedHistory = false; hideCase(); }
}
addEventListener('popstate', route);

/* ==========================================================================
   Lightbox. Drag tracks 1:1 from where it was grabbed; on release the
   momentum is projected forward (Apple's decay formula) to pick the next
   image or snap back, and a spring settles it from the current position.
   Buttons and arrow keys do the same thing without a gesture.
   ========================================================================== */
const lightbox = document.getElementById('lightbox');
const stage = document.getElementById('lb-stage');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
let lbItems = [];
let lbIndex = 0;

function openLightbox(index) {
  const all = JSON.parse(caseBody.dataset.images || '[]');
  const missing = new Set([...caseBody.querySelectorAll('.shot.is-missing')].map((f) => +f.dataset.index));
  lbItems = all.map((img, k) => ({ ...img, k })).filter((img) => !missing.has(img.k));
  lbIndex = Math.max(0, lbItems.findIndex((img) => img.k === index));
  showImage();
  lbImg.style.transform = '';
  lightbox.showModal();
}
function showImage() {
  const img = lbItems[lbIndex];
  if (!img) return;
  lbImg.src = img.src;
  lbImg.width = img.w || 2000;
  lbImg.height = img.h || 1250;
  lbImg.alt = img.alt || img.caption || '';
  lbCap.textContent = img.caption || img.alt || '';
  lightbox.classList.toggle('is-single', lbItems.length < 2);
}

const project = (v, rate = 0.998) => (v / 1000) * rate / (1 - rate);
function settle(x, opacity = 1) {
  lbImg.classList.add('is-settling');
  lbImg.style.transform = `translateX(${x}px)`;
  lbImg.style.opacity = opacity;
}
function go(dir) {
  if (lbItems.length < 2) return settle(0);
  const w = stage.clientWidth;
  if (reduced()) {
    lbImg.classList.add('is-settling');
    lbImg.style.opacity = 0;
    setTimeout(() => { lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length; showImage(); lbImg.style.opacity = 1; }, 200);
    return;
  }
  // Exit along the gesture's direction, enter from the opposite side (same path)
  settle(-dir * w, 0);
  setTimeout(() => {
    lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length;
    showImage();
    lbImg.classList.remove('is-settling');
    lbImg.style.transform = `translateX(${dir * w * 0.35}px)`;
    lbImg.style.opacity = 0;
    lbImg.getBoundingClientRect();
    settle(0, 1);
  }, 180);
}

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || lbItems.length < 2) return;
  // Start from the image's live position so a grab mid-animation doesn't jump
  const live = new DOMMatrixReadOnly(getComputedStyle(lbImg).transform).m41;
  lbImg.classList.remove('is-settling');
  lbImg.style.transform = `translateX(${live}px)`;
  drag = { id: e.pointerId, x0: e.clientX - live, y0: e.clientY, live, axis: null, hist: [{ x: e.clientX, t: e.timeStamp }] };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!drag.axis) {
    // ~10px of hysteresis before committing to a direction
    const mx = Math.abs(e.clientX - (drag.x0 + drag.live)), my = Math.abs(e.clientY - drag.y0);
    if (mx < 10 && my < 10) return;
    drag.axis = mx > my ? 'x' : 'y';
    if (drag.axis === 'x') stage.classList.add('is-dragging');
  }
  if (drag.axis !== 'x') return;
  lbImg.style.transform = `translateX(${dx}px)`;
  drag.hist.push({ x: e.clientX, t: e.timeStamp });
  if (drag.hist.length > 6) drag.hist.shift();
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  stage.classList.remove('is-dragging');
  const d = drag;
  drag = null;
  if (d.axis !== 'x') return settle(0);
  const first = d.hist[0], last = d.hist[d.hist.length - 1];
  const v = last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0; // px/s
  const offset = last.x - d.x0;
  const projected = offset + project(v);
  const w = stage.clientWidth;
  if (Math.abs(projected) > w * 0.35) go(projected < 0 ? 1 : -1);
  else settle(0);
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

document.getElementById('lb-prev').addEventListener('click', () => go(-1));
document.getElementById('lb-next').addEventListener('click', () => go(1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close();
});
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
});

// Open a case study if the page loaded with #/work/<slug>
route();
