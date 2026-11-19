// ---- Early-evening stars in the sky ----
(function makeStars() {
  const box = document.querySelector('.stars');
  if (!box) return;
  const count = window.innerWidth < 760 ? 20 : 45;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.opacity = (0.3 + Math.random() * 0.6).toFixed(2);
    s.style.animationDelay = (Math.random() * -4) + 's';
    box.appendChild(s);
  }
})();

// ---- String lights draped across the hero ----
(function stringLights() {
  const svg = document.querySelector('.lights');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  function draw() {
    const w = svg.clientWidth;
    svg.setAttribute('viewBox', `0 0 ${w} 170`);
    svg.innerHTML = '';
    // two strands, each a sagging curve: [startY, endY, sag]
    [[-6, 30, 120], [40, -6, 95]].forEach(([y0, y2, sag]) => {
      const cx = w / 2, cy = Math.max(y0, y2) + sag;
      const wire = document.createElementNS(NS, 'path');
      wire.setAttribute('class', 'wire');
      wire.setAttribute('d', `M0,${y0} Q${cx},${cy} ${w},${y2}`);
      svg.appendChild(wire);
      const n = Math.max(8, Math.round(w / 70));
      for (let i = 1; i < n; i++) {
        const t = i / n, u = 1 - t;
        const x = 2 * u * t * cx + t * t * w;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y2;
        const drop = document.createElementNS(NS, 'line');
        drop.setAttribute('x1', x); drop.setAttribute('y1', y);
        drop.setAttribute('x2', x); drop.setAttribute('y2', y + 7);
        drop.setAttribute('class', 'wire');
        const bulb = document.createElementNS(NS, 'circle');
        bulb.setAttribute('cx', x); bulb.setAttribute('cy', y + 12); bulb.setAttribute('r', 5);
        bulb.setAttribute('class', 'bulb');
        svg.append(drop, bulb);
      }
    });
  }
  draw();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
})();

// ---- Paint the shop ----
(function paintPicker() {
  const shop = document.querySelector('.shop');
  const swatches = document.querySelectorAll('.swatch');
  if (!shop || !swatches.length) return;
  const KEY = 'shop-paint';
  const apply = name => {
    shop.dataset.paint = name;
    swatches.forEach(s => s.setAttribute('aria-pressed', String(s.dataset.paint === name)));
  };
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && document.querySelector(`.swatch[data-paint="${saved}"]`)) apply(saved);
  } catch (e) {}
  swatches.forEach(s => s.addEventListener('click', () => {
    apply(s.dataset.paint);
    try { localStorage.setItem(KEY, s.dataset.paint); } catch (e) {}
  }));
})();

// ---- Mobile menu ----
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
});
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  })
);

// ---- Tap a scoop to reveal its description ----
document.querySelectorAll('.scoop').forEach(btn => {
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
  });
});

// ---- Flavor filter ----
const chips = document.querySelectorAll('.chip');
const cards = document.querySelectorAll('.cone-card');
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const f = chip.dataset.filter;
    cards.forEach(card => {
      const tags = card.dataset.tags.split(' ');
      card.classList.toggle('is-hidden', f !== 'all' && !tags.includes(f));
    });
  });
});

// ---- "Open now" indicator ----
(function openNow() {
  const el = document.querySelector('.open-now');
  if (!el) return;
  // [openHour, closeHour] in 24h, index 0 = Sunday
  const hours = [[11, 20], [12, 21], [12, 21], [12, 21], [12, 21], [11, 23], [11, 23]];
  const now = new Date();
  const [o, c] = hours[now.getDay()];
  const h = now.getHours() + now.getMinutes() / 60;
  const open = h >= o && h < c;
  el.textContent = open ? 'Open now' : 'Closed · see you soon';
  el.classList.toggle('closed', !open);
})();

// ---- Contact form (front-end only for now) ----
const form = document.querySelector('.contact-scoop');
const msg = form.querySelector('.form-msg');
form.addEventListener('submit', e => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll('input, textarea').forEach(field => {
    const bad = !field.value.trim() || (field.type === 'email' && !field.checkValidity());
    field.classList.toggle('is-invalid', bad);
    if (bad) ok = false;
  });
  if (!ok) {
    msg.textContent = 'Please fill in every field with a valid email.';
    msg.className = 'form-msg err';
    return;
  }
  msg.textContent = "Thank you — we'll be in touch soon.";
  msg.className = 'form-msg ok';
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();

// =====================================================================
// Pop-up pages: Menu / Our Story / Find Us / Contact open in a circle
// that grows from wherever the customer tapped, and shrink back on close.
// =====================================================================
(function panels() {
  const panels = [...document.querySelectorAll('.panel')];
  if (!panels.length) return;
  const byId = Object.fromEntries(panels.map(p => [p.id, p]));
  const closeBtn = document.querySelector('.panel-close');
  const navLinks = document.querySelectorAll('.nav-links a');
  let current = null, lastTrigger = null, z = 60;

  // number each block so they float in one after another
  panels.forEach(p => p.querySelectorAll('.panel-inner > * > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8))));

  function point(e, el) {
    if (e && e.clientX) return [e.clientX, e.clientY];
    if (el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
    return [innerWidth / 2, innerHeight / 2];
  }

  function markNav(id) {
    navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + id));
  }

  function open(id, x, y, instant) {
    const panel = byId[id];
    if (!panel || panel === current) return;
    const prev = current;
    panel.style.setProperty('--x', x + 'px');
    panel.style.setProperty('--y', y + 'px');
    // alternate 61/62 so the new page is on top but always below the nav (80)
    z = z === 61 ? 62 : 61;
    panel.style.zIndex = z;
    panel.scrollTop = 0;
    if (instant) panel.classList.add('no-anim');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
    document.querySelector('.hero').style.setProperty('--ox', x + 'px');
    document.querySelector('.hero').style.setProperty('--oy', y + 'px');
    current = panel;
    markNav(id);
    if (instant) requestAnimationFrame(() => panel.classList.remove('no-anim'));
    setTimeout(() => panel.focus({ preventScroll: true }), instant ? 0 : 500);
    // if switching from another page, quietly close the one underneath
    if (prev) setTimeout(() => {
      prev.classList.add('no-anim');
      prev.classList.remove('is-open');
      prev.setAttribute('aria-hidden', 'true');
      requestAnimationFrame(() => prev.classList.remove('no-anim'));
    }, instant ? 0 : 950);
  }

  function close() {
    if (!current) return;
    current.classList.remove('is-open');
    current.setAttribute('aria-hidden', 'true');
    current = null;
    document.body.classList.remove('panel-open');
    markNav(null);
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
  }

  // every link to #menu / #story / #visit / #contact opens its panel
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = (a.getAttribute('href') || '').slice(1);
    if (byId[id]) {
      e.preventDefault();
      lastTrigger = current ? lastTrigger : a;
      const [x, y] = point(e.detail ? e : null, a);
      open(id, x, y);
      if (location.hash !== '#' + id) history.pushState({ panel: id }, '', '#' + id);
    } else if (id === 'top' || id === '') {
      e.preventDefault();
      if (current) { close(); history.pushState({}, '', location.pathname); }
    }
  });

  closeBtn.addEventListener('click', () => { close(); history.pushState({}, '', location.pathname); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && current) { close(); history.pushState({}, '', location.pathname); }
  });

  // browser back / forward
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (byId[id]) open(id, innerWidth / 2, innerHeight / 2);
    else close();
  });

  // opened with a link like index.html#menu
  const start = location.hash.slice(1);
  if (byId[start]) open(start, innerWidth / 2, innerHeight / 2, true);
})();

// =====================================================================
// Customer login (front-end preview only: nothing is sent to a server,
// and passwords are never stored. Name, email and stamp count are kept
// in this browser so the scoop card can be shown.)
// =====================================================================
(function customerLogin() {
  const form = document.querySelector('.login-card');
  if (!form) return;
  const card = document.querySelector('.member-card');
  const msg = form.querySelector('.form-msg');
  const nameField = form.querySelector('.name-field');
  const submit = form.querySelector('.login-submit');
  const tabs = form.querySelectorAll('.tab');
  const KEY = 'scoop-member';
  const colors = ['#f49ab3', '#9fdcc6', '#ffd36e', '#c9b3f2', '#f2dfb8', '#ff9a7a', '#6b4430', '#a9dde0', '#f49ab3', '#9fdcc6'];
  let mode = 'signin';

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const save = m => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  function setMode(m) {
    mode = m;
    tabs.forEach(t => { const on = t.dataset.mode === m; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    nameField.hidden = m !== 'signup';
    submit.textContent = m === 'signup' ? 'Create account' : 'Sign in';
    form.querySelector('[name=password]').setAttribute('autocomplete', m === 'signup' ? 'new-password' : 'current-password');
    msg.textContent = '';
  }
  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

  function showCard(m) {
    form.hidden = true; card.hidden = false;
    card.querySelector('.member-name').textContent = m.name;
    const ol = card.querySelector('.stamps');
    ol.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const li = document.createElement('li');
      if (i < m.stamps) { li.className = 'on'; li.style.setProperty('--c', colors[i]); li.style.setProperty('--n', i); }
      ol.appendChild(li);
    }
    const left = 10 - m.stamps;
    card.querySelector('.stamp-note').textContent = left > 0
      ? `${m.stamps} of 10 stamps · ${left} more for a free scoop`
      : 'Your next scoop is free!';
  }
  function showForm() { card.hidden = true; form.hidden = false; form.reset(); setMode('signin'); }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input')].filter(f => !f.closest('[hidden]'));
    let ok = true;
    fields.forEach(f => {
      const bad = !f.value.trim() || !f.checkValidity() || (f.name === 'password' && f.value.length < 6);
      f.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { msg.textContent = 'Please check your details (password needs 6+ characters).'; msg.className = 'form-msg err'; return; }
    const email = form.elements.email.value.trim();
    const saved = load();
    const member = (saved && saved.email === email)
      ? { ...saved, stamps: Math.min(10, saved.stamps + 1) }
      : { name: (form.elements.name.value.trim() || email.split('@')[0]), email, stamps: 1 };
    save(member);
    showCard(member);
  });

  card.querySelector('.signout').addEventListener('click', () => { clear(); showForm(); });

  const existing = load();
  if (existing) showCard(existing);
})();

// =====================================================================
// Staff / admin login (front-end preview only: no real authentication.
// A real admin login must be checked on a server, never in the browser.)
// =====================================================================
(function adminLogin() {
  const form = document.querySelector('.admin-form');
  if (!form) return;
  const dash = document.querySelector('.admin-dash');
  const msg = form.querySelector('.form-msg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.elements.email, pass = form.elements.password;
    const badEmail = !email.value.trim() || !email.checkValidity();
    const badPass = pass.value.length < 6;
    email.classList.toggle('is-invalid', badEmail);
    pass.classList.toggle('is-invalid', badPass);
    if (badEmail || badPass) {
      msg.textContent = 'Enter your staff email and a password of 6+ characters.';
      msg.className = 'form-msg err';
      return;
    }
    dash.querySelector('.admin-name').textContent = email.value.trim().split('@')[0];
    form.hidden = true; dash.hidden = false;
    form.reset(); msg.textContent = '';
  });
  dash.querySelector('.admin-signout').addEventListener('click', () => { dash.hidden = true; form.hidden = false; });
})();
