import { getFirebase, isFirebaseConfigured } from './firebase';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, matches storage.rules cap
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
// can't quietly burn through the free-tier storage/bandwidth quota.
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

export async function fetchAllOverrides() {
  if (!isFirebaseConfigured) return new Map();
  const { db, firestore } = await getFirebase();
  const snapshot = await firestore.getDocs(firestore.collection(db, 'memberEdits'));
  const overrides = new Map();
  snapshot.forEach((docSnap) => {
    overrides.set(docSnap.id, docSnap.data());
  });
  return overrides;
}

export async function saveMemberEdit(id, { photoFile, birthDate, deathDate }) {
  if (!isFirebaseConfigured) {
    throw new Error('Editing isn’t available yet -- this deployment has no backend configured.');
  }
  const { db, storage, firestore, storageApi } = await getFirebase();

  const data = {};

  if (photoFile) {
    const error = validatePhotoFile(photoFile);
    if (error) throw new Error(error);
    const resized = await resizeImageFile(photoFile);
    const ext = resized.type === 'image/png' ? 'png' : 'jpg';
    const photoRef = storageApi.ref(storage, `member-photos/${id}.${ext}`);
    await storageApi.uploadBytes(photoRef, resized, { contentType: resized.type });
    data.photoURL = await storageApi.getDownloadURL(photoRef);
  }

  if (birthDate !== undefined) data.birthDate = birthDate;
  if (deathDate !== undefined) data.deathDate = deathDate;
  data.updatedAt = firestore.serverTimestamp();

  await firestore.setDoc(firestore.doc(db, 'memberEdits', id), data, { merge: true });
  return data;
}
