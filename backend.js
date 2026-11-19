// =====================================================================
// Firebase backend for Scoop & Swirl.
// Only runs when firebase-config.js has a config. It replaces the demo
// data store (window.DB in script.js) with Firebase Auth + Firestore,
// then fires "db-ready" so the page reloads its data.
//
// Firestore layout
//   settings/menu   { items: [{name, info, price, show}], updated }
//   settings/hours  { rows:  [{day, time}], updated }
//   messages/{id}   { name, email, message, date }
//   members/{uid}   { name, email, stamps, last }
// Who can do what is enforced by firestore.rules.
// =====================================================================
const config = window.SCOOP_FIREBASE_CONFIG;

if (config) {
  const V = '10.12.2';
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
  ]);

  const app = initializeApp(config);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const ADMIN = String(window.SCOOP_ADMIN_EMAIL || '').toLowerCase();

  // resolves once Firebase knows whether someone is already signed in
  const authReady = new Promise(res => { const off = A.onAuthStateChanged(auth, u => { off(); res(u); }); });
  const isAdminUser = u => !!u && (u.email || '').toLowerCase() === ADMIN;
  const toISO = ts => (ts && ts.toDate ? ts.toDate().toISOString() : ts || null);

  const friendly = err => {
    const c = (err && err.code) || '';
    const map = {
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/user-not-found': 'No account with that email. Try "Create account".',
      'auth/email-already-in-use': 'That email already has an account. Try "Sign in".',
      'auth/weak-password': 'Please use a password with at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email.',
      'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
      'auth/network-request-failed': 'No connection. Please check your internet.',
      'permission-denied': 'You do not have permission to do that.'
    };
    return new Error(map[c] || (err && err.message) || 'Something went wrong.');
  };
  const guard = fn => async (...args) => { try { return await fn(...args); } catch (e) { throw friendly(e); } };

  const settings = id => F.doc(db, 'settings', id);

  window.DB = {
    remote: true,

    getMenu: guard(async () => { const s = await F.getDoc(settings('menu')); return s.exists() ? s.data().items : null; }),
    saveMenu: guard(async items => F.setDoc(settings('menu'), { items, updated: F.serverTimestamp() })),
    resetMenu: guard(async () => F.deleteDoc(settings('menu'))),

    getHours: guard(async () => { const s = await F.getDoc(settings('hours')); return s.exists() ? s.data().rows : null; }),
    saveHours: guard(async rows => F.setDoc(settings('hours'), { rows, updated: F.serverTimestamp() })),
    resetHours: guard(async () => F.deleteDoc(settings('hours'))),

    addMessage: guard(async m => F.addDoc(F.collection(db, 'messages'), {
      name: m.name, email: m.email, message: m.message, date: F.serverTimestamp()
    })),
    listMessages: guard(async () => {
      const q = F.query(F.collection(db, 'messages'), F.orderBy('date', 'desc'), F.limit(200));
      return (await F.getDocs(q)).docs.map(d => ({ id: d.id, ...d.data(), date: toISO(d.data().date) }));
    }),
    deleteMessage: guard(async id => F.deleteDoc(F.doc(db, 'messages', id))),

    memberSignIn: guard(async (mode, name, email, password) => {
      let cred;
      if (mode === 'signup') {
        cred = await A.createUserWithEmailAndPassword(auth, email, password);
        const display = name || email.split('@')[0];
        await A.updateProfile(cred.user, { displayName: display });
        const m = { name: display, email, stamps: 1, last: F.serverTimestamp() };
        await F.setDoc(F.doc(db, 'members', cred.user.uid), m);
        return { ...m, last: new Date().toISOString() };
      }
      cred = await A.signInWithEmailAndPassword(auth, email, password);
      const ref = F.doc(db, 'members', cred.user.uid);
      const snap = await F.getDoc(ref);
      if (!snap.exists()) {
        const m = { name: cred.user.displayName || email.split('@')[0], email, stamps: 1, last: F.serverTimestamp() };
        await F.setDoc(ref, m);
        return m;
      }
      const cur = snap.data();
      const stamps = Math.min(10, (cur.stamps || 0) + 1);
      await F.updateDoc(ref, { stamps, last: F.serverTimestamp() });
      return { ...cur, stamps };
    }),
    memberCurrent: guard(async () => {
      const u = await authReady;
      const user = auth.currentUser || u;
      if (!user || isAdminUser(user)) return null;
      const snap = await F.getDoc(F.doc(db, 'members', user.uid));
      return snap.exists() ? snap.data() : null;
    }),
    memberSignOut: guard(async () => A.signOut(auth)),
    listMembers: guard(async () => {
      const q = F.query(F.collection(db, 'members'), F.orderBy('last', 'desc'), F.limit(500));
      return (await F.getDocs(q)).docs.map(d => ({ ...d.data(), last: toISO(d.data().last) }));
    }),

    adminSignIn: guard(async (email, password) => {
      if (email.toLowerCase() !== ADMIN) return false;
      const cred = await A.signInWithEmailAndPassword(auth, email, password);
      if (!isAdminUser(cred.user)) { await A.signOut(auth); return false; }
      return true;
    }),
    adminIsIn: guard(async () => { await authReady; return isAdminUser(auth.currentUser); }),
    adminSignOut: guard(async () => A.signOut(auth)),
    adminName: async () => (auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email.split('@')[0])) || 'Admin'
  };

  window.dispatchEvent(new Event('db-ready'));
}
