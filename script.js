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
// demo admin: icecream@gmail.com / icecream@2026! (also accepted without the '!')
const LOCAL_ADMIN_HASHES = ['db38ff5ae1bd4a88732c586f36b30578f7862fe1b27aab8c766b4434b6eb9b4f', '71ab49cb3757624bdacccad4782b1658c9af4823656e0b7c70c5b5b1fc464006'];
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
    const known = store.get('scoop-members', []).find(m => m.email === email);
    const member = (saved && saved.email === email) ? { ...saved }
      : known ? { name: known.name, email, stamps: known.stamps || 0 }
      : { name: name || email.split('@')[0], email, stamps: 0 };
    store.set('scoop-member', member);
    const list = store.get('scoop-members', []).filter(m => m.email !== member.email);
    list.unshift({ ...member, last: new Date().toISOString() });
    store.set('scoop-members', list.slice(0, 500));
    return member;
  },
  async memberCurrent() { return store.get('scoop-member', null); },
  async memberSignOut() { store.del('scoop-member'); },
  async memberAddStamp() {
    const m = store.get('scoop-member', null); if (!m) return null;
    m.stamps = (m.stamps || 0) + 1; store.set('scoop-member', m);
    const list = store.get('scoop-members', []).filter(x => x.email !== m.email);
    list.unshift({ ...m, last: new Date().toISOString() }); store.set('scoop-members', list);
    return m.stamps;
  },
  async listMembers() { return store.get('scoop-members', []); },
  async adminSignIn(email, password) {
    // demo login forgives capital letters and stray spaces (phone keyboards add them)
    const h = await sha256(email.trim().toLowerCase() + ':' + password.trim().toLowerCase());
    if (h === null) throw new Error('Please open the site over https to sign in.');
    const ok = LOCAL_ADMIN_HASHES.includes(h);
    try { ok ? sessionStorage.setItem('scoop-admin', '1') : sessionStorage.removeItem('scoop-admin'); } catch (e) {}
    return ok;
  },
  async adminIsIn() { try { return sessionStorage.getItem('scoop-admin') === '1'; } catch (e) { return false; } },
  async adminSignOut() { try { sessionStorage.removeItem('scoop-admin'); } catch (e) {} },
  async adminName() { return 'Admin'; },
  async placeOrder(order) {
    const all = store.get('scoop-orders', []);
    all.unshift({ ...order, createdAt: new Date().toISOString() });
    store.set('scoop-orders', all.slice(0, 500));
    return order.id;
  },
  async getOrder(id) { return store.get('scoop-orders', []).find(o => o.id === id) || null; },
  async listOrders() { return store.get('scoop-orders', []); },
  async updateOrderStatus(id, status) {
    store.set('scoop-orders', store.get('scoop-orders', []).map(o => o.id === id ? { ...o, status } : o));
  }
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

  // order of pages in the top bar, used to pick the cube's turning direction
  const ORDER = ['menu', 'story', 'visit', 'order', 'login', 'admin'];
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CUBE_MS = 950;
  let switching = false;

  function open(id, x, y, instant) {
    const panel = byId[id];
    if (!panel || panel === current || switching) return;
    const prev = current;
    panel.style.setProperty('--x', x + 'px');
    panel.style.setProperty('--y', y + 'px');
    // alternate 61/62 so the new page is on top but always below the nav (80)
    z = z === 61 ? 62 : 61;
    panel.style.zIndex = z;
    panel.scrollTop = 0;
    current = panel;
    markNav(id);

    // ---- page -> page: 3D cube turn ----
    if (prev && !instant && !reduceMotion) {
      switching = true;
      const dir = ORDER.indexOf(id) >= ORDER.indexOf(prev.id) ? 'left' : 'right';
      document.body.classList.add('cube-stage');
      prev.classList.add('cube', 'cube-out-' + dir);
      panel.classList.add('cube', 'cube-in-' + dir, 'is-open');
      panel.setAttribute('aria-hidden', 'false');
      setTimeout(() => {
        prev.classList.add('no-anim');
        prev.classList.remove('is-open', 'cube', 'cube-out-' + dir);
        prev.setAttribute('aria-hidden', 'true');
        panel.classList.remove('cube', 'cube-in-' + dir);
        document.body.classList.remove('cube-stage');
        requestAnimationFrame(() => prev.classList.remove('no-anim'));
        switching = false;
        panel.focus({ preventScroll: true });
      }, CUBE_MS);
      return;
    }

    // ---- first page from the shop: its own reveal ----
    if (instant) panel.classList.add('no-anim');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
    document.querySelector('.hero').style.setProperty('--ox', x + 'px');
    document.querySelector('.hero').style.setProperty('--oy', y + 'px');
    if (instant) requestAnimationFrame(() => panel.classList.remove('no-anim'));
    setTimeout(() => panel.focus({ preventScroll: true }), instant ? 0 : 500);
    // (instant or reduced-motion switch) quietly close the page underneath
    if (prev) {
      prev.classList.add('no-anim');
      prev.classList.remove('is-open');
      prev.setAttribute('aria-hidden', 'true');
      requestAnimationFrame(() => prev.classList.remove('no-anim'));
    }
  }

  // ---- 3D art-gallery walk: hallway -> turn to the page's frame -> page opens ----
  const g3d = document.querySelector('.g3d');
  const g3dWorld = g3d && g3d.querySelector('.g3d-world');
  const g3dLabel = g3d && g3d.querySelector('.g3d-label b');
  const ART = { menu: ['L', -700], story: ['R', -1100], visit: ['L', -1500], order: ['R', -1900], login: ['L', -2300], admin: ['R', -2700] };
  const NAMES = { menu: 'Menu', story: 'Our Story', visit: 'Find Us', order: 'Order Online', login: 'Members', admin: 'Staff Only' };
  const WALK_MS = 2200;
  let walking = false;
  function galleryTo(id, x, y) {
    if (!byId[id] || byId[id] === current || walking) return;
    if (!g3d || reduceMotion || !ART[id]) { open(id, x, y); return; }
    walking = true;
    const [side, fz] = ART[id];
    const st = g3d.style;
    st.setProperty('--s', Math.max(.55, Math.min(1.25, innerHeight / 800)).toFixed(3));
    st.setProperty('--walk', (-200 - fz) + 'px');           // walk until the frame is just ahead
    st.setProperty('--zc', '560px');                        // finish close enough to fill the screen
    st.setProperty('--ry', side === 'L' ? '-90deg' : '90deg');
    st.setProperty('--tx', side === 'L' ? '597px' : '-597px');
    st.setProperty('--ty', '40px');
    st.setProperty('--tz', (-fz) + 'px');
    st.setProperty('--dur', WALK_MS + 'ms');
    g3dLabel.textContent = NAMES[id] || '';
    g3dWorld.classList.remove('walk'); void g3dWorld.offsetWidth;
    g3d.classList.add('on');
    g3dWorld.classList.add('walk');
    setTimeout(() => {
      open(id, x, y, true);                 // page appears behind the gallery…
      g3d.classList.remove('on');           // …and the gallery fades away into it
      walking = false;                      // the next tap works straight away
      setTimeout(() => { if (!g3d.classList.contains('on')) g3dWorld.classList.remove('walk'); }, 500);
    }, WALK_MS);
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
      galleryTo(id, x, y);
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
    if (byId[id]) open(id, innerWidth / 2, innerHeight / 2, true);
    else close();
  });

  // opened with a link like index.html#menu
  const start = location.hash.slice(1);
  if (byId[start]) open(start, innerWidth / 2, innerHeight / 2, true);
})();

// =====================================================================
// SCOOP CLUB (Members board): welcome treat, a stamp per order (every 10th
// scoop free), a daily prize wheel, member levels and a rewards wallet
// that is used at checkout.
// =====================================================================
(function scoopClub() {
  const form = document.querySelector('.login-card');
  if (!form) return;
  const card = document.querySelector('.club-card');
  const msg = form.querySelector('.form-msg');
  const nameField = form.querySelector('.name-field');
  const submit = form.querySelector('.login-submit');
  const tabs = form.querySelectorAll('.tab');
  const note = form.querySelector('.demo-note');
  const colors = ['#f49ab3', '#9fdcc6', '#ffd36e', '#c9b3f2', '#f2dfb8', '#ff9a7a', '#6b4430', '#a9dde0', '#f49ab3', '#9fdcc6'];
  const WHEEL = [
    { label: '15% off', type: 'pct', value: 15 }, { label: '$2 off', type: 'amt', value: 2 },
    { label: 'Free delivery', type: 'delivery', value: 0 }, { label: '10% off', type: 'pct', value: 10 },
    { label: 'Double stamp', type: 'stamp2', value: 0 }, { label: '5% off', type: 'pct', value: 5 }
  ];
  const DAY = 864e5;
  const today = () => new Date().toDateString();
  const tierOf = s => s >= 15 ? { name: '🏆 Triple Sundae', next: null } : s >= 5 ? { name: '🍨 Double Scoop', next: 15 } : { name: '🍦 Single Scoop', next: 5 };
  let mode = 'signin', spinning = false, turned = 0;

  // ---- shared club API (the order page uses it) ----
  const Club = window.ScoopClub = {
    member: null,
    key(k) { return `scoop-${k}:${(this.member && this.member.email || '').toLowerCase()}`; },
    seq: 0,
    // a slow check that started earlier must never overwrite a newer sign-in / sign-out
    async refresh() { const my = ++this.seq; const m = await window.DB.memberCurrent().catch(() => null); if (my === this.seq) this.member = m; return this.member; },
    wallet() { if (!this.member) return []; const now = Date.now(); return store.get(this.key('wallet'), []).filter(r => !r.expires || r.expires > now); },
    add(r) { const w = this.wallet(); w.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...r }); store.set(this.key('wallet'), w); render(); },
    consume(id) { store.set(this.key('wallet'), this.wallet().filter(r => r.id !== id)); render(); },
    async addStamps(n) {
      if (!this.member) return 0;
      let s = this.member.stamps || 0;
      for (let i = 0; i < n; i++) {
        const v = await window.DB.memberAddStamp().catch(() => null);
        s = typeof v === 'number' ? v : s + 1;
        if (s % 10 === 0) this.add({ label: 'Free scoop ($7 off)', type: 'amt', value: 7 });
      }
      this.member.stamps = s; render();
      return n;
    }
  };

  function setMode(m) {
    mode = m;
    tabs.forEach(t => { const on = t.dataset.mode === m; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    nameField.hidden = m !== 'signup';
    submit.textContent = m === 'signup' ? 'Join the club' : 'Sign in';
    form.querySelector('[name=password]').setAttribute('autocomplete', m === 'signup' ? 'new-password' : 'current-password');
    msg.textContent = '';
  }
  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

  // ---- member card ----
  const wheelDisc = card.querySelector('.wheel-disc');
  const spinBtn = card.querySelector('.spin-btn');
  const spinMsg = card.querySelector('.spin-msg');
  function render() {
    const m = Club.member;
    if (!m) return;
    const s = m.stamps || 0;
    card.querySelector('.member-name').textContent = m.name;
    const t = tierOf(s);
    card.querySelector('.tier-name').textContent = t.name;
    card.querySelector('.tier-next').textContent = t.next ? `${t.next - s} more order${t.next - s === 1 ? '' : 's'} to the next level` : 'Top level reached. Thank you!';
    const filled = s > 0 && s % 10 === 0 ? 10 : s % 10;
    const ol = card.querySelector('.stamps'); ol.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const li = document.createElement('li');
      if (i < filled) { li.className = 'on'; li.style.setProperty('--c', colors[i]); li.style.setProperty('--n', i); }
      ol.appendChild(li);
    }
    card.querySelector('.stamp-note').textContent = s === 0 ? 'Order online to collect your first stamp.'
      : filled === 10 ? 'Card full! A free scoop is in your rewards.' : `${filled} of 10 · ${10 - filled} more for a free scoop`;
    const spunToday = store.get(Club.key('spin'), '') === today();
    if (!spinning) { spinBtn.disabled = spunToday; spinBtn.textContent = spunToday ? 'Come back tomorrow' : 'Spin today'; }
    const w = Club.wallet();
    card.querySelector('.wallet-list').innerHTML = w.length ? w.map(r => `<li><b>${r.label}</b>${r.expires ? `<small>until ${new Date(r.expires).toLocaleDateString()}</small>` : ''}</li>`).join('')
      : '<li class="empty">No rewards yet. Spin the wheel!</li>';
  }

  spinBtn.addEventListener('click', () => {
    if (spinning || !Club.member || store.get(Club.key('spin'), '') === today()) return;
    spinning = true; spinBtn.disabled = true; spinBtn.textContent = 'Spinning…'; spinMsg.textContent = '';
    const k = Math.floor(Math.random() * WHEEL.length);
    turned += 360 * 5 + (360 - ((k * 60 + 30 + turned) % 360));   // land segment k under the pin
    wheelDisc.style.transform = `rotate(${turned}deg)`;
    setTimeout(() => {
      const prize = WHEEL[k];
      store.set(Club.key('spin'), today());
      Club.add({ label: prize.label, type: prize.type, value: prize.value, expires: Date.now() + 7 * DAY });
      spinning = false; render();
      spinMsg.textContent = `🎉 You won ${prize.label}! It's in your rewards for 7 days.`;
    }, 4300);
  });

  function showCard() { form.hidden = true; card.hidden = false; render(); }
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
      const signed = await window.DB.memberSignIn(mode, form.elements.name.value.trim(), form.elements.email.value.trim(), form.elements.password.value);
      Club.seq++; Club.member = signed;
      // welcome treat, once per member
      if (!store.get(Club.key('welcomed'), false)) {
        store.set(Club.key('welcomed'), true);
        Club.add({ label: '10% off your first order', type: 'pct', value: 10 });
      }
      showCard();
      spinMsg.textContent = mode === 'signup' ? '🎁 Welcome! 10% off your first order is in your rewards.' : '';
    } catch (err) {
      msg.textContent = err.message || 'Sign-in failed. Please try again.'; msg.className = 'form-msg err';
    } finally { submit.disabled = false; }
  });

  card.querySelector('.signout').addEventListener('click', async () => { await window.DB.memberSignOut(); Club.seq++; Club.member = null; showForm(); });

  onDBReady(async () => {
    if (note) note.textContent = window.DB.remote
      ? 'Your account is stored securely. Passwords are never visible to us.'
      : 'Preview: your club card is saved on this device until online accounts are connected.';
    const m = await Club.refresh();
    if (m) showCard(); else if (!card.hidden) showForm();
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
    ({ overview: renderOverview, orders: renderOrders, menu: renderMenu, hours: renderHours, messages: renderMessages, members: renderMembers })[name]();
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

  // ---------- orders ----------
  const STATUS = {
    new: 'New', preparing: 'Preparing',
    out: o => o.type === 'pickup' ? 'Ready for pickup' : 'Out for delivery',
    done: o => o.type === 'pickup' ? 'Picked up' : 'Delivered',
    cancelled: 'Cancelled'
  };
  const label = o => { const v = STATUS[o.status] || o.status; return typeof v === 'function' ? v(o) : v; };
  const NEXT = { new: 'preparing', preparing: 'out', out: 'done' };
  const NEXT_LABEL = { new: 'Start preparing', preparing: o => o.type === 'pickup' ? 'Ready for pickup' : 'Out for delivery', out: o => o.type === 'pickup' ? 'Mark picked up' : 'Mark delivered' };
  const money = n => '$' + Number(n || 0).toFixed(2);
  const orderBox = dash.querySelector('.order-list');
  const badge = dash.querySelector('.badge-new');
  let orderFilter = 'open';
  dash.querySelectorAll('.ochip').forEach(c => c.addEventListener('click', () => {
    dash.querySelectorAll('.ochip').forEach(x => x.classList.toggle('is-active', x === c));
    orderFilter = c.dataset.of; renderOrders();
  }));
  function updateBadge(list) {
    const n = list.filter(o => o.status === 'new').length;
    badge.textContent = n; badge.hidden = n === 0;
    return n;
  }
  async function renderOrders() {
    if (!orderBox.children.length) orderBox.innerHTML = '<p class="empty">Loading…</p>';
    const all = await window.DB.listOrders().catch(e => { orderBox.innerHTML = `<p class="empty">Could not load orders: ${esc(e.message)}</p>`; return null; });
    if (!all) return;
    updateBadge(all);
    const list = all.filter(o => orderFilter === 'all' ? true : orderFilter === 'done' ? o.status === 'done' : !['done', 'cancelled'].includes(o.status));
    orderBox.innerHTML = list.length ? list.map(o => {
      const nl = NEXT_LABEL[o.status]; const nextText = typeof nl === 'function' ? nl(o) : nl;
      return `
      <article class="ord-item">
        <header><b>${esc(o.id)} · ${esc(o.name)}</b><span class="ord-status s-${esc(o.status)}">${esc(label(o))}</span></header>
        <small>${esc(fmt(o.createdAt))} · ${o.type === 'pickup' ? '🏖 Pickup' : '🛵 Delivery'} · ${o.payment === 'card' ? '💳 Card' : '💵 Cash'} on ${o.type === 'pickup' ? 'pickup' : 'delivery'}</small>
        <small>📞 <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>${o.type === 'delivery' ? ` · 📍 ${esc(o.address)}` : ''}</small>
        <ul>${(o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)} (${i.style === 'cone' ? 'cone' : 'cup'}) — ${money(i.unit * i.qty)}</li>`).join('')}</ul>
        ${o.notes ? `<small>📝 ${esc(o.notes)}</small>` : ''}
        <b>Total ${money(o.total)}</b>
        <div class="ord-actions">
          ${NEXT[o.status] ? `<button type="button" class="btn-scoop" data-oid="${esc(o.id)}" data-to="${NEXT[o.status]}">${esc(nextText)}</button>` : ''}
          ${!['done', 'cancelled'].includes(o.status) ? `<button type="button" class="dash-ghost" data-oid="${esc(o.id)}" data-to="cancelled">Cancel</button>` : ''}
        </div>
      </article>`; }).join('') : '<p class="empty">No orders here yet. New online orders appear here.</p>';
  }
  orderBox.addEventListener('click', async e => {
    const b = e.target.closest('[data-oid]'); if (!b) return;
    if (b.dataset.to === 'cancelled' && !confirm('Cancel order ' + b.dataset.oid + '?')) return;
    b.disabled = true;
    await window.DB.updateOrderStatus(b.dataset.oid, b.dataset.to).catch(err => alert('Could not update: ' + err.message));
    renderOrders();
  });
  // keep orders fresh while the dashboard is open
  setInterval(() => {
    if (dash.hidden || !document.querySelector('#admin.is-open')) return;
    const active = dash.querySelector('.dash-tabs .tab.is-active');
    if (active && active.dataset.tab === 'orders') renderOrders();
    else window.DB.listOrders().then(updateBadge).catch(() => {});
  }, 20000);

  async function renderOverview() {
    const orders = await window.DB.listOrders().catch(() => []);
    dash.querySelector('[data-stat=neworders]').textContent = updateBadge(orders);
    const today = new Date().toDateString();
    const sales = orders.filter(o => o.status !== 'cancelled' && o.createdAt && new Date(o.createdAt).toDateString() === today)
      .reduce((t, o) => t + Number(o.total || 0), 0);
    dash.querySelector('[data-stat=todaysales]').textContent = money(sales);
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
        <header><b>${esc(m.name)}</b><small>${esc(m.stamps || 0)} stamps · ${(m.stamps || 0) >= 15 ? '🏆 Triple Sundae' : (m.stamps || 0) >= 5 ? '🍨 Double Scoop' : '🍦 Single Scoop'}</small></header>
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

// =====================================================================
// Online order + delivery (customer side)
// =====================================================================
(function onlineOrder() {
  const panel = document.getElementById('order');
  if (!panel) return;
  const CONE_EXTRA = 0.5, DELIVERY_FEE = 3, FREE_OVER = 30;
  const money = n => '$' + Number(n || 0).toFixed(2);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let cart = store.get('scoop-cart', []);
  const save = () => store.set('scoop-cart', cart);

  const fab = document.querySelector('.cart-fab');
  const list = panel.querySelector('.cart-list');
  const empty = panel.querySelector('.cart-empty');
  const form = panel.querySelector('.order-form');
  const msg = form.querySelector('.form-msg');
  const checkout = panel.querySelector('.checkout');
  const track = panel.querySelector('.track-card');
  const trackForm = panel.querySelector('.track-form');

  const unit = i => Number(i.price) + (i.style === 'cone' ? CONE_EXTRA : 0);
  const subtotal = () => cart.reduce((t, i) => t + unit(i) * i.qty, 0);
  const isDelivery = () => form.elements.type.value === 'delivery';
  const fee = () => (isDelivery() && cart.length && subtotal() < FREE_OVER) ? DELIVERY_FEE : 0;
  const Club = () => window.ScoopClub;
  const rewardSel = form.elements.reward;
  const chosenReward = () => { const c = Club(); return c && rewardSel.value ? c.wallet().find(r => r.id === rewardSel.value) : null; };
  function discount() {
    const r = chosenReward(); if (!r || !cart.length) return 0;
    const sub = subtotal(), max = Math.max(0, sub + fee() - 0.5);       // never below $0.50
    const d = r.type === 'pct' ? sub * r.value / 100 : r.type === 'amt' ? r.value : r.type === 'delivery' ? fee() : 0;
    return Math.min(max, Math.round(d * 100) / 100);
  }
  function syncRewards() {
    const c = Club(), member = c && c.member, w = member ? c.wallet().filter(r => r.type !== 'stamp2' || true) : [];
    const keep = rewardSel.value;
    rewardSel.innerHTML = '<option value="">No reward</option>' + w.map(r => `<option value="${r.id}">${esc(r.label)}</option>`).join('');
    if (w.some(r => r.id === keep)) rewardSel.value = keep;
    form.querySelector('.reward-field').hidden = !w.length;
    form.querySelector('.club-hint').hidden = !!member;
  }

  function render() {
    const count = cart.reduce((t, i) => t + i.qty, 0);
    fab.hidden = count === 0;
    fab.querySelector('.cf-count').textContent = count;
    fab.querySelector('.cf-total').textContent = money(subtotal() + fee() - discount());
    empty.hidden = cart.length > 0;
    list.innerHTML = cart.map((i, n) => `
      <li data-n="${n}">
        <div>
          <p class="ci-name">${esc(i.name)}</p>
          <div class="ci-style">
            <button type="button" data-style="cup" class="${i.style === 'cup' ? 'on' : ''}">Cup</button>
            <button type="button" data-style="cone" class="${i.style === 'cone' ? 'on' : ''}">Waffle cone +${money(CONE_EXTRA)}</button>
          </div>
        </div>
        <div class="qty"><button type="button" data-q="-1" aria-label="One less">−</button><b>${i.qty}</b><button type="button" data-q="1" aria-label="One more">+</button></div>
        <span class="ci-price">${money(unit(i) * i.qty)}</span>
      </li>`).join('');
    form.querySelector('.sum-sub').textContent = money(subtotal());
    form.querySelector('.fee-row').hidden = !isDelivery();
    form.querySelector('.sum-fee').textContent = fee() ? money(fee()) : 'Free';
    const d = discount(), r = chosenReward();
    form.querySelector('.disc-row').hidden = !r;
    form.querySelector('.disc-label').textContent = r ? r.label : 'Reward';
    form.querySelector('.sum-disc').textContent = r && r.type === 'stamp2' ? '2× stamps' : '−' + money(d);
    form.querySelector('.sum-tot').textContent = money(subtotal() + fee() - d);
    form.querySelector('.fee-note').hidden = !isDelivery();
    form.querySelector('.addr-field').hidden = !isDelivery();
    form.querySelector('.place-btn').disabled = cart.length === 0;
  }

  // "+ Add to order" on each flavor
  document.querySelectorAll('.cone-card').forEach(card => {
    const btn = card.querySelector('.add-btn'); if (!btn) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const name = card.querySelector('.scoop-name').textContent.trim();
      const price = parseFloat(card.querySelector('.price').textContent.replace('$', '')) || 0;
      const hit = cart.find(i => i.name === name && i.style === 'cone');
      if (hit) { hit.qty = Math.min(20, hit.qty + 1); hit.price = price; }
      else cart.push({ name, price, style: 'cone', qty: 1 });
      save(); render();
      btn.classList.add('added'); btn.textContent = '✓ Added';
      setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+ Add'; }, 1200);
      fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
    });
  });

  list.addEventListener('click', e => {
    const li = e.target.closest('li[data-n]'); if (!li) return;
    const item = cart[Number(li.dataset.n)];
    const q = e.target.closest('[data-q]'), st = e.target.closest('[data-style]');
    if (q) { item.qty += Number(q.dataset.q); if (item.qty <= 0) cart.splice(Number(li.dataset.n), 1); else item.qty = Math.min(20, item.qty); }
    if (st) item.style = st.dataset.style;
    save(); render();
  });
  form.addEventListener('change', render);
  new MutationObserver(() => { if (panel.classList.contains('is-open')) { const c = Club(); (c ? c.refresh() : Promise.resolve()).then(() => { syncRewards(); render(); }); } })
    .observe(panel, { attributes: true, attributeFilter: ['class'] });

  // hide the floating cart while the order page itself is open
  new MutationObserver(() => document.body.classList.toggle('on-order', panel.classList.contains('is-open')))
    .observe(panel, { attributes: true, attributeFilter: ['class'] });

  const newId = () => 'SS-' + Array.from(crypto.getRandomValues(new Uint8Array(5)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cart.length) return;
    const need = ['name', 'phone'].concat(isDelivery() ? ['address'] : []);
    let ok = true;
    need.forEach(n => { const f = form.elements[n]; const bad = !f.value.trim(); f.classList.toggle('is-invalid', bad); if (bad) ok = false; });
    if (!ok) { msg.textContent = 'Please fill in your name, phone' + (isDelivery() ? ' and address.' : '.'); msg.className = 'form-msg err'; return; }
    const order = {
      id: newId(), status: 'new',
      type: isDelivery() ? 'delivery' : 'pickup',
      payment: form.elements.payment.value,
      name: form.elements.name.value.trim().slice(0, 80),
      phone: form.elements.phone.value.trim().slice(0, 30),
      address: isDelivery() ? form.elements.address.value.trim().slice(0, 300) : '',
      notes: form.elements.notes.value.trim().slice(0, 200),
      items: cart.map(i => ({ name: i.name, style: i.style, qty: i.qty, unit: Number(unit(i).toFixed(2)) })),
      subtotal: Number(subtotal().toFixed(2)), deliveryFee: fee(), discount: discount(), reward: chosenReward() ? chosenReward().label : '',
      total: Number((subtotal() + fee() - discount()).toFixed(2))
    };
    const btn = form.querySelector('.place-btn'); btn.disabled = true; msg.textContent = '';
    try {
      await window.DB.placeOrder(order);
      const mine = store.get('scoop-my-orders', []); mine.unshift(order.id); store.set('scoop-my-orders', mine.slice(0, 20));
      // Scoop Club: use up the reward and earn stamps (double stamp reward = 2)
      const used = chosenReward(), c = Club();
      let earned = 0;
      if (c && c.member) {
        if (used) c.consume(used.id);
        earned = await c.addStamps(used && used.type === 'stamp2' ? 2 : 1);
      }
      cart = []; save(); rewardSel.value = ''; syncRewards(); render();
      form.elements.notes.value = '';
      showTracking({ ...order, createdAt: new Date().toISOString() });
      const ts = track.querySelector('.t-stamp');
      ts.hidden = !earned;
      ts.textContent = earned ? `🍦 +${earned} Scoop Club stamp${earned > 1 ? 's' : ''} earned!` : '';
    } catch (err) {
      msg.textContent = 'Sorry, the order could not be placed: ' + err.message; msg.className = 'form-msg err';
    } finally { btn.disabled = cart.length === 0; }
  });

  // ---- tracking ----
  const STEPS = ['new', 'preparing', 'out', 'done'];
  let timer = null, tracking = null;
  function paint(o) {
    track.querySelector('.t-name').textContent = o.name;
    track.querySelector('.t-id').textContent = o.id;
    track.querySelector('.t-out').textContent = o.type === 'pickup' ? 'Ready for pickup' : 'Out for delivery';
    track.querySelector('.t-done').textContent = o.type === 'pickup' ? 'Picked up' : 'Delivered';
    const at = STEPS.indexOf(o.status);
    track.querySelectorAll('.tracker li').forEach((li, i) => { li.classList.toggle('on', at >= i); li.classList.toggle('now', at === i && o.status !== 'done'); });
    track.querySelector('.t-cancel').hidden = o.status !== 'cancelled';
    track.querySelector('.t-items').innerHTML = (o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)} (${i.style === 'cone' ? 'cone' : 'cup'})</li>`).join('');
    track.querySelector('.t-total').textContent = (o.discount ? `${o.reward} −${money(o.discount)} · ` : '') + 'Total ' + money(o.total) + (o.payment === 'card' ? ' · card' : ' · cash') + ' on ' + (o.type === 'pickup' ? 'pickup' : 'delivery');
  }
  function showTracking(o) {
    tracking = o.id; paint(o);
    checkout.hidden = true; track.hidden = false;
    clearInterval(timer);
    timer = setInterval(async () => {
      if (!panel.classList.contains('is-open') || track.hidden) return;
      const fresh = await window.DB.getOrder(tracking).catch(() => null);
      if (fresh) { paint(fresh); if (['done', 'cancelled'].includes(fresh.status)) clearInterval(timer); }
    }, 15000);
  }
  track.querySelector('.new-order').addEventListener('click', () => { clearInterval(timer); track.hidden = true; checkout.hidden = false; render(); });

  trackForm.addEventListener('submit', async e => {
    e.preventDefault();
    const m = trackForm.querySelector('.form-msg');
    const id = trackForm.elements.oid.value.trim().toUpperCase();
    if (!id) return;
    const o = await window.DB.getOrder(id).catch(() => null);
    if (!o) { m.textContent = 'No order found with that number.'; m.className = 'form-msg err'; return; }
    m.textContent = ''; showTracking(o);
    if (panel.scrollTo) panel.scrollTo({ top: 0, behavior: 'smooth' });
  });

  render();
  // if this visitor has an order on the way, show its tracker first
  onDBReady(async () => {
    const last = store.get('scoop-my-orders', [])[0];
    if (!last || cart.length) return;
    const o = await window.DB.getOrder(last).catch(() => null);
    if (o && !['done', 'cancelled'].includes(o.status)) showTracking(o);
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

// ---- "Show" button on password fields ----
document.querySelectorAll('input[type=password]').forEach(inp => {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pw-toggle'; btn.textContent = 'Show';
  btn.setAttribute('aria-label', 'Show password');
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  const wrap = document.createElement('span'); wrap.className = 'pw-wrap';
  inp.parentNode.insertBefore(wrap, inp); wrap.append(inp, btn);
});

// ---- luxury menu: number cards so they float in one after another ----
document.querySelectorAll('#menu .cone-card').forEach((c, i) => c.style.setProperty('--k', i));
document.querySelectorAll('#menu .g').forEach((g, i) => g.style.setProperty('--k', i));

// =====================================================================
// MENU WALL-ART VIEWER: one framed flavour at a time with Prev / Next,
// dots, arrow keys and swipe. Filters and admin edits are respected.
// =====================================================================
(function artViewer() {
  const panel = document.getElementById('menu');
  const viewer = panel && panel.querySelector('.art-viewer:not(.photo-viewer)');
  if (!viewer) return;
  const row = viewer.querySelector('.cone-row');
  const prev = viewer.querySelector('.av-prev'), next = viewer.querySelector('.av-next');
  const countB = viewer.querySelector('.av-count b'), countN = viewer.querySelector('.av-count span'), countName = viewer.querySelector('.av-count em');
  const dots = viewer.querySelector('.av-dots');
  let list = [], idx = 0, filterName = '';
  const SLIDE_MS = 850;

  const visible = () => [...row.querySelectorAll('.cone-card')].filter(c => !c.classList.contains('is-hidden') && !c.classList.contains('is-off'));

  function rebuild(keep) {
    const keepCard = keep ? list[idx] : null;
    list = visible();
    idx = keepCard && list.includes(keepCard) ? list.indexOf(keepCard) : 0;
    row.querySelectorAll('.cone-card').forEach(c => c.classList.remove('is-active', 'from-left', 'leave-left', 'leave-right'));
    dots.innerHTML = list.map((c, i) => `<button type="button" role="tab" aria-label="${c.querySelector('.scoop-name').textContent}" data-i="${i}"></button>`).join('');
    show(idx, 0);
  }

  function show(i, dir) {
    if (!list.length) { countB.textContent = 0; countN.textContent = 0; countName.textContent = 'No flavours here'; prev.disabled = next.disabled = true; return; }
    const old = list[idx];
    idx = (i + list.length) % list.length;
    const card = list[idx];
    if (old && old !== card) {
      old.classList.remove('is-active', 'from-left', 'rehang');
      old.classList.add(dir > 0 ? 'leave-left' : 'leave-right');
      setTimeout(() => old.classList.remove('leave-left', 'leave-right'), SLIDE_MS + 20);
    }
    card.classList.remove('leave-left', 'leave-right');
    card.classList.toggle('from-left', dir < 0);
    void card.offsetWidth;                       // start the slide from the correct side
    card.classList.remove('from-left');
    card.classList.add('is-active');
    countB.textContent = idx + 1; countN.textContent = list.length;
    countName.textContent = (filterName ? filterName + ' · ' : '') + card.querySelector('.scoop-name').textContent;
    dots.querySelectorAll('button').forEach((d, n) => d.setAttribute('aria-selected', String(n === idx)));
    prev.disabled = next.disabled = list.length < 2;
  }

  prev.addEventListener('click', () => show(idx - 1, -1));
  next.addEventListener('click', () => show(idx + 1, 1));
  dots.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const n = +b.dataset.i; show(n, n > idx ? 1 : -1); } });

  // arrow keys while the Menu page is open
  document.addEventListener('keydown', e => {
    if (!panel.classList.contains('is-open') || /input|textarea/i.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') { show(idx + 1, 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { show(idx - 1, -1); e.preventDefault(); }
  });
  // swipe on phones
  let x0 = null, y0 = null;
  row.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  row.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? show(idx + 1, 1) : show(idx - 1, -1);
    x0 = null;
  });

  // filters and admin edits change which flavours are shown
  panel.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    filterName = c.dataset.filter === 'all' ? '' : c.textContent.trim();
    setTimeout(refilter, 0);
  }));

  // animate a category change: the current piece slides off the wall and the
  // category's first flavour slides in (or the same piece is re-hung)
  function refilter() {
    const oldCard = list[idx];
    if (oldCard) oldCard.classList.remove('rehang');
    const wasHidden = oldCard && oldCard.classList.contains('is-hidden');
    list = visible();
    idx = 0;
    dots.innerHTML = list.map((c, i) => `<button type="button" role="tab" aria-label="${c.querySelector('.scoop-name').textContent}" data-i="${i}"></button>`).join('');
    const card = list[0];
    if (!card) { show(0, 0); return; }
    row.querySelectorAll('.cone-card').forEach(c => { if (c !== oldCard && c !== card) c.classList.remove('is-active', 'from-left', 'leave-left', 'leave-right', 'rehang'); });
    if (!oldCard || oldCard === card) {
      card.classList.remove('rehang'); void card.offsetWidth; card.classList.add('rehang');
      setTimeout(() => card.classList.remove('rehang'), SLIDE_MS * 2);
      list.length && show(0, 0);
      return;
    }
    if (wasHidden) { oldCard.classList.remove('is-hidden'); void oldCard.offsetWidth; }   // keep it on the wall long enough to slide away
    oldCard.classList.remove('is-active', 'from-left');
    oldCard.classList.add('leave-left');
    setTimeout(() => { oldCard.classList.remove('leave-left'); if (wasHidden) oldCard.classList.add('is-hidden'); }, SLIDE_MS + 20);
    card.classList.remove('leave-left', 'leave-right', 'from-left', 'is-active');
    void card.offsetWidth;
    setTimeout(() => { list[idx] === card && show(0, 0); }, 120);
  }
  new MutationObserver(() => { if (panel.classList.contains('is-open')) rebuild(true); })
    .observe(panel, { attributes: true, attributeFilter: ['class'] });
  rebuild(false);
})();

// =====================================================================
// "MOMENTS BY THE SEA" photo viewer: same wall-art slides as the menu
// =====================================================================
(function photoViewer() {
  const viewer = document.querySelector('#menu .photo-viewer');
  if (!viewer) return;
  const row = viewer.querySelector('.gallery-row');
  const items = [...row.querySelectorAll('.g')];
  const prev = viewer.querySelector('.av-prev'), next = viewer.querySelector('.av-next');
  const countB = viewer.querySelector('.av-count b'), countN = viewer.querySelector('.av-count span'), countName = viewer.querySelector('.av-count em');
  const dots = viewer.querySelector('.av-dots');
  const SLIDE_MS = 850;
  let idx = 0;
  dots.innerHTML = items.map((g, i) => `<button type="button" role="tab" aria-label="${g.querySelector('figcaption').textContent}" data-i="${i}"></button>`).join('');
  countN.textContent = items.length;

  function show(i, dir) {
    const old = items[idx];
    idx = (i + items.length) % items.length;
    const g = items[idx];
    if (old !== g) {
      old.classList.remove('is-active', 'from-left');
      old.classList.add(dir > 0 ? 'leave-left' : 'leave-right');
      setTimeout(() => old.classList.remove('leave-left', 'leave-right'), SLIDE_MS + 20);
    }
    g.classList.remove('leave-left', 'leave-right');
    g.classList.toggle('from-left', dir < 0);
    void g.offsetWidth;
    g.classList.remove('from-left');
    g.classList.add('is-active');
    countB.textContent = idx + 1;
    countName.textContent = g.querySelector('figcaption').textContent;
    dots.querySelectorAll('button').forEach((d, n) => d.setAttribute('aria-selected', String(n === idx)));
  }
  prev.addEventListener('click', () => show(idx - 1, -1));
  next.addEventListener('click', () => show(idx + 1, 1));
  dots.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const n = +b.dataset.i; if (n !== idx) show(n, n > idx ? 1 : -1); } });
  let x0 = null, y0 = null;
  row.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  row.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? show(idx + 1, 1) : show(idx - 1, -1);
    x0 = null;
  });
  show(0, 0);
})();
