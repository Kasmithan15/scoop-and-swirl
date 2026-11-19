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

// =====================================================================
// DATA LAYER
// The site talks to window.DB. By default it's the local demo store
// (this browser only). When Firebase is configured (firebase-config.js),
// backend.js swaps in a Firebase version and fires "db-ready".
// =====================================================================
const LOCAL_ADMIN_HASH = '6a0ed9f0b881f4d045aa66d01bcf9d9ad38716f2af29fa9dc6bff79ba00a38c9'; // demo: admin@scoopandswirl.com / Swirl@2026
async function sha256(text) {
  if (!(window.crypto && crypto.subtle)) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
window.DB = {
  remote: false,
  async getMenu() { return store.get('scoop-menu', null); },
  async saveMenu(items) { store.set('scoop-menu', items); },
  async resetMenu() { store.del('scoop-menu'); },
  async getHours() { return store.get('scoop-hours', null); },
  async saveHours(rows) { store.set('scoop-hours', rows); },
  async resetHours() { store.del('scoop-hours'); },
  async addMessage(m) {
    const inbox = store.get('scoop-messages', []);
    inbox.unshift({ id: String(Date.now()), ...m, date: new Date().toISOString() });
    store.set('scoop-messages', inbox.slice(0, 200));
  },
  async listMessages() { return store.get('scoop-messages', []).map((m, i) => ({ id: m.id || String(i), ...m })); },
  async deleteMessage(id) { store.set('scoop-messages', store.get('scoop-messages', []).filter((m, i) => (m.id || String(i)) !== id)); },
  async memberSignIn(mode, name, email, password) {
    const saved = store.get('scoop-member', null);
    const member = (saved && saved.email === email)
      ? { ...saved, stamps: Math.min(10, saved.stamps + 1) }
      : { name: name || email.split('@')[0], email, stamps: 1 };
    store.set('scoop-member', member);
    const list = store.get('scoop-members', []).filter(m => m.email !== member.email);
    list.unshift({ ...member, last: new Date().toISOString() });
    store.set('scoop-members', list.slice(0, 500));
    return member;
  },
  async memberCurrent() { return store.get('scoop-member', null); },
  async memberSignOut() { store.del('scoop-member'); },
  async listMembers() { return store.get('scoop-members', []); },
  async adminSignIn(email, password) {
    const h = await sha256(email.toLowerCase() + ':' + password);
    if (h === null) throw new Error('Please open the site over https to sign in.');
    const ok = h === LOCAL_ADMIN_HASH;
    try { ok ? sessionStorage.setItem('scoop-admin', '1') : sessionStorage.removeItem('scoop-admin'); } catch (e) {}
    return ok;
  },
  async adminIsIn() { try { return sessionStorage.getItem('scoop-admin') === '1'; } catch (e) { return false; } },
  async adminSignOut() { try { sessionStorage.removeItem('scoop-admin'); } catch (e) {} },
  async adminName() { return 'Admin'; }
};
const onDBReady = fn => { fn(); window.addEventListener('db-ready', fn); };

// ---- Contact form: messages go to the admin dashboard ----
const form = document.querySelector('.contact-scoop');
const msg = form.querySelector('.form-msg');
form.addEventListener('submit', async e => {
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
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    await window.DB.addMessage({
      name: form.elements.name.value.trim().slice(0, 99),
      email: form.elements.email.value.trim().slice(0, 199),
      message: form.elements.message.value.trim().slice(0, 2999)
    });
    msg.textContent = "Thank you — we'll be in touch soon.";
    msg.className = 'form-msg ok';
    form.reset();
  } catch (err) {
    msg.textContent = 'Sorry, the message could not be sent. Please try again.';
    msg.className = 'form-msg err';
  } finally { btn.disabled = false; }
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
// Customer login (Members board). With Firebase: real accounts.
// Without it: demo mode, kept in this browser only.
// =====================================================================
(function customerLogin() {
  const form = document.querySelector('.login-card');
  if (!form) return;
  const card = document.querySelector('.member-card');
  const msg = form.querySelector('.form-msg');
  const nameField = form.querySelector('.name-field');
  const submit = form.querySelector('.login-submit');
  const tabs = form.querySelectorAll('.tab');
  const note = form.querySelector('.demo-note');
  const colors = ['#f49ab3', '#9fdcc6', '#ffd36e', '#c9b3f2', '#f2dfb8', '#ff9a7a', '#6b4430', '#a9dde0', '#f49ab3', '#9fdcc6'];
  let mode = 'signin';

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

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input')].filter(f => !f.closest('[hidden]'));
    let ok = true;
    fields.forEach(f => {
      const bad = !f.value.trim() || !f.checkValidity() || (f.name === 'password' && f.value.length < 6);
      f.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { msg.textContent = 'Please check your details (password needs 6+ characters).'; msg.className = 'form-msg err'; return; }
    submit.disabled = true; msg.textContent = '';
    try {
      const member = await window.DB.memberSignIn(mode, form.elements.name.value.trim(), form.elements.email.value.trim(), form.elements.password.value);
      showCard(member);
    } catch (err) {
      msg.textContent = err.message || 'Sign-in failed. Please try again.'; msg.className = 'form-msg err';
    } finally { submit.disabled = false; }
  });

  card.querySelector('.signout').addEventListener('click', async () => { await window.DB.memberSignOut(); showForm(); });

  onDBReady(async () => {
    if (note) note.textContent = window.DB.remote
      ? 'Your account is stored securely. Passwords are never visible to us.'
      : "Preview only: sign-ins aren't connected to a real account system yet.";
    const m = await window.DB.memberCurrent().catch(() => null);
    if (m) showCard(m); else if (!card.hidden) showForm();
  });
})();

// =====================================================================
// Admin dashboard (STAFF ONLY sign)
// With Firebase: secure sign-in, and edits are shared with every visitor.
// Without it: demo login, edits saved in this browser only.
// =====================================================================
(function adminDashboard() {
  const form = document.querySelector('.admin-form');
  const dash = document.querySelector('.admin-dash');
  if (!form || !dash) return;
  const msg = form.querySelector('.form-msg');
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = iso => { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } };

  // ---------- the live menu + hours on the website ----------
  const cards = [...document.querySelectorAll('.cone-card')];
  const original = cards.map(c => ({
    name: c.querySelector('.scoop-name').textContent,
    info: c.querySelector('.scoop-info').textContent,
    price: c.querySelector('.price').textContent.replace('$', ''),
    show: true
  }));
  let menu = original;
  function applyMenu(list) {
    menu = list && list.length === cards.length ? list : original;
    cards.forEach((c, i) => {
      const f = menu[i];
      c.querySelector('.scoop-name').textContent = f.name;
      c.querySelector('.scoop-info').textContent = f.info;
      c.querySelector('.price').textContent = '$' + Number(f.price || 0).toFixed(2);
      c.classList.toggle('is-off', !f.show);
    });
  }
  const hoursDl = document.querySelector('.visit .hours dl');
  const hoursOriginal = hoursDl ? [...hoursDl.querySelectorAll('dt')].map(dt => ({ day: dt.textContent, time: dt.nextElementSibling.textContent })) : [];
  let hours = hoursOriginal;
  function applyHours(list) {
    hours = list && list.length ? list : hoursOriginal;
    if (hoursDl) hoursDl.innerHTML = hours.map(h => `<dt>${esc(h.day)}</dt><dd>${esc(h.time)}</dd>`).join('');
  }
  async function loadPublic() {
    applyMenu(await window.DB.getMenu().catch(() => null));
    applyHours(await window.DB.getHours().catch(() => null));
  }

  // ---------- sign in ----------
  const note = form.querySelector('.demo-note');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; msg.textContent = '';
    try {
      const ok = await window.DB.adminSignIn(form.elements.email.value.trim(), form.elements.password.value);
      if (!ok) { form.elements.password.classList.add('is-invalid'); msg.textContent = 'Wrong email or password.'; msg.className = 'form-msg err'; return; }
      form.reset(); showDash();
    } catch (err) {
      msg.textContent = err.message || 'Sign-in failed.'; msg.className = 'form-msg err';
    } finally { btn.disabled = false; }
  });
  dash.querySelector('.admin-signout').addEventListener('click', async () => { await window.DB.adminSignOut(); dash.hidden = true; form.hidden = false; });

  // ---------- dashboard ----------
  const tabs = dash.querySelectorAll('.dash-tabs .tab');
  const panes = dash.querySelectorAll('.dash-pane');
  const paneMsg = name => dash.querySelector(`[data-pane=${name}] .dash-msg`);
  function showTab(name) {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    panes.forEach(p => { p.hidden = p.dataset.pane !== name; });
    ({ overview: renderOverview, menu: renderMenu, hours: renderHours, messages: renderMessages, members: renderMembers })[name]();
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  async function showDash() {
    form.hidden = true; dash.hidden = false;
    dash.querySelector('.admin-name').textContent = await window.DB.adminName();
    dash.querySelector('.demo-note').textContent = window.DB.remote
      ? '✓ Connected to Firebase: changes are live for every visitor.'
      : 'Demo mode: changes are saved in this browser only.';
    showTab('overview');
  }

  async function renderOverview() {
    dash.querySelector('[data-stat=flavors]').textContent = menu.filter(f => f.show).length;
    const open = document.querySelector('.open-now');
    dash.querySelector('[data-stat=status]').textContent = open && open.classList.contains('closed') ? 'Closed' : 'Open';
    dash.querySelector('[data-stat=messages]').textContent = (await window.DB.listMessages().catch(() => [])).length;
    dash.querySelector('[data-stat=members]').textContent = (await window.DB.listMembers().catch(() => [])).length;
  }

  const menuBox = dash.querySelector('.menu-editor');
  function renderMenu() {
    menuBox.innerHTML = menu.map((f, i) => `
      <div class="edit-row" data-i="${i}">
        <input type="text" name="name" value="${esc(f.name)}" aria-label="Flavor name" maxlength="60">
        <input type="text" name="info" value="${esc(f.info)}" aria-label="Description" maxlength="200">
        <input type="number" name="price" value="${esc(f.price)}" min="0" step="0.25" aria-label="Price in dollars">
        <label class="show"><input type="checkbox" name="show" ${f.show ? 'checked' : ''}> On menu</label>
      </div>`).join('');
  }
  dash.querySelector('[data-act=save-menu]').addEventListener('click', async () => {
    const list = [...menuBox.querySelectorAll('.edit-row')].map(r => ({
      name: r.querySelector('[name=name]').value.trim() || 'Untitled flavor',
      info: r.querySelector('[name=info]').value.trim(),
      price: r.querySelector('[name=price]').value || '0',
      show: r.querySelector('[name=show]').checked
    }));
    try { await window.DB.saveMenu(list); applyMenu(list); paneMsg('menu').textContent = '✓ Menu saved. Open the Menu page to see it.'; }
    catch (e) { paneMsg('menu').textContent = 'Could not save: ' + e.message; }
  });
  dash.querySelector('[data-act=reset-menu]').addEventListener('click', async () => {
    try { await window.DB.resetMenu(); applyMenu(null); renderMenu(); paneMsg('menu').textContent = 'Menu reset to the original flavors.'; }
    catch (e) { paneMsg('menu').textContent = 'Could not reset: ' + e.message; }
  });

  const hoursBox = dash.querySelector('.hours-editor');
  function renderHours() {
    hoursBox.innerHTML = hours.map(h => `
      <div class="edit-row">
        <input type="text" name="day" value="${esc(h.day)}" aria-label="Days" maxlength="40">
        <input type="text" name="time" value="${esc(h.time)}" aria-label="Opening time" maxlength="40">
      </div>`).join('');
  }
  dash.querySelector('[data-act=save-hours]').addEventListener('click', async () => {
    const list = [...hoursBox.querySelectorAll('.edit-row')].map(r => ({
      day: r.querySelector('[name=day]').value.trim(), time: r.querySelector('[name=time]').value.trim()
    })).filter(h => h.day);
    try { await window.DB.saveHours(list); applyHours(list); paneMsg('hours').textContent = '✓ Hours saved. Open Find Us to see them.'; }
    catch (e) { paneMsg('hours').textContent = 'Could not save: ' + e.message; }
  });
  dash.querySelector('[data-act=reset-hours]').addEventListener('click', async () => {
    try { await window.DB.resetHours(); applyHours(null); renderHours(); paneMsg('hours').textContent = 'Hours reset to the original times.'; }
    catch (e) { paneMsg('hours').textContent = 'Could not reset: ' + e.message; }
  });

  const msgBox = dash.querySelector('.msg-list');
  async function renderMessages() {
    msgBox.innerHTML = '<p class="empty">Loading…</p>';
    const inbox = await window.DB.listMessages().catch(e => { msgBox.innerHTML = `<p class="empty">Could not load messages: ${esc(e.message)}</p>`; return null; });
    if (!inbox) return;
    msgBox.innerHTML = inbox.length ? inbox.map(m => `
      <article class="msg-item">
        <header><b>${esc(m.name)}</b><small>${esc(fmt(m.date))}</small></header>
        <small><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></small>
        <p>${esc(m.message)}</p>
        <button type="button" class="dash-ghost" data-del="${esc(m.id)}">Delete</button>
      </article>`).join('') : '<p class="empty">No messages yet. They appear here when someone uses the form on the Find Us page.</p>';
  }
  msgBox.addEventListener('click', async e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    b.disabled = true;
    await window.DB.deleteMessage(b.dataset.del).catch(() => {});
    renderMessages();
  });

  const memBox = dash.querySelector('.member-list');
  async function renderMembers() {
    memBox.innerHTML = '<p class="empty">Loading…</p>';
    const list = await window.DB.listMembers().catch(e => { memBox.innerHTML = `<p class="empty">Could not load members: ${esc(e.message)}</p>`; return null; });
    if (!list) return;
    memBox.innerHTML = list.length ? list.map(m => `
      <article class="mem-item">
        <header><b>${esc(m.name)}</b><small>${esc(m.stamps)} / 10 stamps</small></header>
        <small>${esc(m.email)} · last visit ${esc(fmt(m.last))}</small>
      </article>`).join('') : '<p class="empty">No members yet. They appear here when customers sign in at the Members board.</p>';
  }

  onDBReady(async () => {
    if (note) note.textContent = window.DB.remote
      ? 'Staff only. Secure sign-in.'
      : 'Staff only. Demo login: works in this browser, not a secure server login yet.';
    await loadPublic();
    if (await window.DB.adminIsIn().catch(() => false)) showDash();
    else if (!dash.hidden) { dash.hidden = true; form.hidden = false; }
  });
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
