// ---- tiny storage helpers (browser only; safe if storage is blocked) ----
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

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
  const inbox = store.get('scoop-messages', []);
  inbox.unshift({
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    message: form.elements.message.value.trim(),
    date: new Date().toISOString()
  });
  store.set('scoop-messages', inbox.slice(0, 200));
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
    const list = store.get('scoop-members', []).filter(m => m.email !== member.email);
    list.unshift({ ...member, last: new Date().toISOString() });
    store.set('scoop-members', list.slice(0, 500));
    showCard(member);
  });

  card.querySelector('.signout').addEventListener('click', () => { clear(); showForm(); });

  const existing = load();
  if (existing) showCard(existing);
})();

// =====================================================================
// Admin dashboard
// Demo login (checked in the browser, so NOT secure for real use):
//   email: admin@scoopandswirl.com   password: Swirl@2026
// Only a SHA-256 hash of "email:password" is kept in this file.
// Edits are saved in this browser (localStorage). A real, shared admin
// needs a backend such as Firebase or Supabase.
// =====================================================================
(function adminDashboard() {
  const form = document.querySelector('.admin-form');
  const dash = document.querySelector('.admin-dash');
  if (!form || !dash) return;
  const ADMIN_HASH = '6a0ed9f0b881f4d045aa66d01bcf9d9ad38716f2af29fa9dc6bff79ba00a38c9';
  const msg = form.querySelector('.form-msg');
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = iso => { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } };

  // ---------- the live menu + hours on the website ----------
  const cards = [...document.querySelectorAll('.cone-card')];
  const original = cards.map(c => ({
    name: c.querySelector('.scoop-name').textContent,
    info: c.querySelector('.scoop-info').textContent,
    price: c.querySelector('.price').textContent.replace('$', ''),
    show: true
  }));
  function applyMenu(list) {
    cards.forEach((c, i) => {
      const f = list[i] || original[i];
      c.querySelector('.scoop-name').textContent = f.name;
      c.querySelector('.scoop-info').textContent = f.info;
      c.querySelector('.price').textContent = '$' + Number(f.price || 0).toFixed(2);
      c.classList.toggle('is-off', !f.show);
    });
  }
  const hoursDl = document.querySelector('.visit .hours dl');
  const hoursOriginal = hoursDl ? [...hoursDl.querySelectorAll('dt')].map(dt => ({ day: dt.textContent, time: dt.nextElementSibling.textContent })) : [];
  function applyHours(list) {
    if (!hoursDl) return;
    hoursDl.innerHTML = list.map(h => `<dt>${esc(h.day)}</dt><dd>${esc(h.time)}</dd>`).join('');
  }
  // show saved changes to every visitor of this browser
  applyMenu(store.get('scoop-menu', original));
  applyHours(store.get('scoop-hours', hoursOriginal));

  // ---------- sign in ----------
  async function sha256(text) {
    if (!(window.crypto && crypto.subtle)) return null;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const isIn = () => { try { return sessionStorage.getItem('scoop-admin') === '1'; } catch (e) { return false; } };
  const setIn = on => { try { on ? sessionStorage.setItem('scoop-admin', '1') : sessionStorage.removeItem('scoop-admin'); } catch (e) {} };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.elements.email.value.trim().toLowerCase();
    const pass = form.elements.password.value;
    const h = await sha256(email + ':' + pass);
    if (h === null) { msg.textContent = 'Please open the site over https to sign in.'; msg.className = 'form-msg err'; return; }
    if (h !== ADMIN_HASH) {
      form.elements.password.classList.add('is-invalid');
      msg.textContent = 'Wrong email or password.'; msg.className = 'form-msg err';
      return;
    }
    setIn(true); form.reset(); msg.textContent = ''; showDash();
  });
  dash.querySelector('.admin-signout').addEventListener('click', () => { setIn(false); dash.hidden = true; form.hidden = false; });

  // ---------- dashboard ----------
  const tabs = dash.querySelectorAll('.dash-tabs .tab');
  const panes = dash.querySelectorAll('.dash-pane');
  function showTab(name) {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    panes.forEach(p => { p.hidden = p.dataset.pane !== name; });
    ({ overview: renderOverview, menu: renderMenu, hours: renderHours, messages: renderMessages, members: renderMembers })[name]();
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  function showDash() { form.hidden = true; dash.hidden = false; showTab('overview'); }

  function renderOverview() {
    const menu = store.get('scoop-menu', original);
    dash.querySelector('[data-stat=flavors]').textContent = menu.filter(f => f.show).length;
    dash.querySelector('[data-stat=messages]').textContent = store.get('scoop-messages', []).length;
    dash.querySelector('[data-stat=members]').textContent = store.get('scoop-members', []).length;
    const open = document.querySelector('.open-now');
    dash.querySelector('[data-stat=status]').textContent = open && open.classList.contains('closed') ? 'Closed' : 'Open';
  }

  const menuBox = dash.querySelector('.menu-editor');
  function renderMenu() {
    const menu = store.get('scoop-menu', original);
    menuBox.innerHTML = menu.map((f, i) => `
      <div class="edit-row" data-i="${i}">
        <input type="text" name="name" value="${esc(f.name)}" aria-label="Flavor name">
        <input type="text" name="info" value="${esc(f.info)}" aria-label="Description">
        <input type="number" name="price" value="${esc(f.price)}" min="0" step="0.25" aria-label="Price in dollars">
        <label class="show"><input type="checkbox" name="show" ${f.show ? 'checked' : ''}> On menu</label>
      </div>`).join('');
  }
  const paneMsg = name => dash.querySelector(`[data-pane=${name}] .dash-msg`);
  dash.querySelector('[data-act=save-menu]').addEventListener('click', () => {
    const list = [...menuBox.querySelectorAll('.edit-row')].map(r => ({
      name: r.querySelector('[name=name]').value.trim() || 'Untitled flavor',
      info: r.querySelector('[name=info]').value.trim(),
      price: r.querySelector('[name=price]').value || '0',
      show: r.querySelector('[name=show]').checked
    }));
    store.set('scoop-menu', list); applyMenu(list);
    paneMsg('menu').textContent = '✓ Menu saved. Open the Menu page to see it.';
  });
  dash.querySelector('[data-act=reset-menu]').addEventListener('click', () => {
    store.del('scoop-menu'); applyMenu(original); renderMenu();
    paneMsg('menu').textContent = 'Menu reset to the original flavors.';
  });

  const hoursBox = dash.querySelector('.hours-editor');
  function renderHours() {
    hoursBox.innerHTML = store.get('scoop-hours', hoursOriginal).map(h => `
      <div class="edit-row">
        <input type="text" name="day" value="${esc(h.day)}" aria-label="Days">
        <input type="text" name="time" value="${esc(h.time)}" aria-label="Opening time">
      </div>`).join('');
  }
  dash.querySelector('[data-act=save-hours]').addEventListener('click', () => {
    const list = [...hoursBox.querySelectorAll('.edit-row')].map(r => ({
      day: r.querySelector('[name=day]').value.trim(), time: r.querySelector('[name=time]').value.trim()
    })).filter(h => h.day);
    store.set('scoop-hours', list); applyHours(list);
    paneMsg('hours').textContent = '✓ Hours saved. Open Find Us to see them.';
  });
  dash.querySelector('[data-act=reset-hours]').addEventListener('click', () => {
    store.del('scoop-hours'); applyHours(hoursOriginal); renderHours();
    paneMsg('hours').textContent = 'Hours reset to the original times.';
  });

  const msgBox = dash.querySelector('.msg-list');
  function renderMessages() {
    const inbox = store.get('scoop-messages', []);
    msgBox.innerHTML = inbox.length ? inbox.map((m, i) => `
      <article class="msg-item">
        <header><b>${esc(m.name)}</b><small>${esc(fmt(m.date))}</small></header>
        <small><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></small>
        <p>${esc(m.message)}</p>
        <button type="button" class="dash-ghost" data-del="${i}">Delete</button>
      </article>`).join('') : '<p class="empty">No messages yet. They appear here when someone uses the form on the Find Us page.</p>';
  }
  msgBox.addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const inbox = store.get('scoop-messages', []); inbox.splice(Number(b.dataset.del), 1);
    store.set('scoop-messages', inbox); renderMessages();
  });

  const memBox = dash.querySelector('.member-list');
  function renderMembers() {
    const list = store.get('scoop-members', []);
    memBox.innerHTML = list.length ? list.map(m => `
      <article class="mem-item">
        <header><b>${esc(m.name)}</b><small>${esc(m.stamps)} / 10 stamps</small></header>
        <small>${esc(m.email)} · last visit ${esc(fmt(m.last))}</small>
      </article>`).join('') : '<p class="empty">No members yet. They appear here when customers sign in at the Members board.</p>';
  }

  if (isIn()) showDash();
})();

// ---- phones: start the swipeable scene centred on the serving window ----
(function centreScene() {
  const strip = document.querySelector('.scene-scroll');
  if (!strip) return;
  const centre = () => {
    if (strip.scrollWidth <= strip.clientWidth) return;
    strip.style.scrollBehavior = 'auto';
    strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) * 0.4;
    strip.style.scrollBehavior = '';
  };
  window.addEventListener('load', centre);
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(centre, 200); });
})();
