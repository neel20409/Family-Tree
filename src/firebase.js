const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lets the app run (read-only, no crash) when a fork/local checkout hasn't
// set up its own Firebase project yet -- the edit UI checks this before
// attempting any read/write instead of throwing on a half-empty config.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

// Firestore only -- photo files go to Cloudinary instead of Firebase Storage
// (see cloudinary.js), since Storage now requires the paid Blaze plan just
// to turn on, and this project intentionally stays on Firebase's free tier.
// The SDK is a few hundred KB gzipped -- most visitors never touch the edit
// feature, so it's loaded as a separate on-demand chunk (dynamic import)
// rather than bundled into the main entry point that has to be parsed
// before the tree can even render. Cached after the first call so repeated
// reads/saves in one session don't re-fetch the chunk.
let firebasePromise = null;

export function getFirebase() {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
    ]).then(([{ initializeApp }, firestore]) => {
      const app = initializeApp(config);
      return {
        db: firestore.getFirestore(app),
        firestore,
      };
    });
  }
  return firebasePromise;
}
