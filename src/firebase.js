const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lets the app run (read-only, no crash) when a fork/local checkout hasn't
// set up its own Firebase project yet -- the edit UI checks this before
// attempting any read/write instead of throwing on a half-empty config.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

// The Firebase SDK is a few hundred KB gzipped -- most visitors never touch
// the edit feature, so it's loaded as a separate on-demand chunk (dynamic
// import) rather than bundled into the main entry point that has to be
// parsed before the tree can even render. Cached after the first call so
// repeated reads/saves in one session don't re-fetch the chunk.
let firebasePromise = null;

export function getFirebase() {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/storage'),
    ]).then(([{ initializeApp }, firestore, storageApi]) => {
      const app = initializeApp(config);
      return {
        db: firestore.getFirestore(app),
        storage: storageApi.getStorage(app),
        firestore,
        storageApi,
      };
    });
  }
  return firebasePromise;
}
