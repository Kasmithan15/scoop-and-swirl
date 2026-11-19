# Connect Scoop & Swirl to Firebase (about 10 minutes)

Firebase gives the site real, secure logins and shared data:

- **Admin dashboard**: secure sign-in; menu and hours edits show for every visitor.
- **Find Us form**: messages from any phone arrive in the admin dashboard.
- **Members board**: real customer accounts with scoop stamps.

Until `firebase-config.js` is filled in, the site keeps working in demo mode.

## 1. Create the project
1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**, name it `scoop-and-swirl`, and finish (Google Analytics is optional).

## 2. Add a web app and copy its settings
1. On the project home, click the **Web** icon (`</>`), nickname it `website`, click **Register app** (no hosting needed).
2. Copy the `firebaseConfig = { ... }` values it shows.
3. Open `firebase-config.js` and replace `null` in `window.SCOOP_FIREBASE_CONFIG = null;` with that object.

## 3. Turn on email/password sign-in
1. **Build > Authentication > Get started**.
2. **Sign-in method** tab: enable **Email/Password** and save.
3. **Users** tab: **Add user** with the admin email `icecream@gmail.com` (or your own) and a strong password. This is the admin login.
4. **Settings** tab > **Authorized domains** > **Add domain**: `kasmithan15.github.io`.

If you use a different admin email, change it in both `firebase-config.js` (`SCOOP_ADMIN_EMAIL`) and `firestore.rules`.

## 4. Create the database and its security rules
1. **Build > Firestore Database > Create database**. Pick a location near you and start in **production mode**.
2. Open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
3. The first time someone signs in to the Members board, Firestore may show a link asking to create an index for sorting members or messages. Click it and wait a minute.

## 5. Publish
Commit and push `firebase-config.js`. The site updates at
<https://kasmithan15.github.io/scoop-and-swirl/> within a minute.

## Check it works
- STAFF ONLY sign: sign in with the admin user. The dashboard should say **Connected to Firebase**.
- Edit a flavor price and save, then open the site on a phone. The new price shows.
- Send a message from Find Us on a phone. It appears under **Messages**.
