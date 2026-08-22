import { getFirebase, isFirebaseConfigured } from './firebase';
import { uploadPhoto } from './cloudinary';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, matches the Cloudinary preset's max file size
const MAX_PHOTO_EDGE = 1600; // px, longest edge after client-side resize
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePhotoFile(file) {
  if (!file) return null;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Image is too large (max 5MB).';
  }
  return null;
}

// Downscales a large photo (phone camera photos are routinely 5-10MB) to a
// sane display size before it ever leaves the browser, so a single edit
// can't quietly burn through the free-tier bandwidth quota.
async function resizeImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, 0.85));
  return blob || file;
}

// Live Firestore listener rather than a one-time fetch -- with the old
// getDocs() snapshot, a photo/date edit only ever showed up for the visitor
// who made it (via the optimistic local update in handleEditSaved); anyone
// already on the page, in another tab, or who loaded before the edit
// happened needed a manual reload to see it. onSnapshot pushes every
// change to every open session as it happens, matching this project's
// Firestore database being on the "Realtime updates: Enabled" setting.
// Returns an unsubscribe function (a no-op if Firebase isn't configured).
export async function subscribeToOverrides(callback) {
  if (!isFirebaseConfigured) {
    callback(new Map());
    return () => {};
  }
  const { db, firestore } = await getFirebase();
  return firestore.onSnapshot(firestore.collection(db, 'memberEdits'), (snapshot) => {
    const overrides = new Map();
    snapshot.forEach((docSnap) => {
      overrides.set(docSnap.id, docSnap.data());
    });
    callback(overrides);
  });
}

export async function saveMemberEdit(id, { photoFile, birthDate, deathDate }) {
  if (!isFirebaseConfigured) {
    throw new Error('Editing isn’t available yet -- this deployment has no backend configured.');
  }
  const { db, firestore } = await getFirebase();

  const data = {};

  if (photoFile) {
    const error = validatePhotoFile(photoFile);
    if (error) throw new Error(error);
    const resized = await resizeImageFile(photoFile);
    data.photoURL = await uploadPhoto(resized, id);
  }

  if (birthDate !== undefined) data.birthDate = birthDate;
  if (deathDate !== undefined) data.deathDate = deathDate;
  data.updatedAt = firestore.serverTimestamp();

  await firestore.setDoc(firestore.doc(db, 'memberEdits', id), data, { merge: true });
  return data;
}
