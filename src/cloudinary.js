const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Uploads directly from the browser via an *unsigned* preset -- cloud name +
// preset name are not secret (same model as Firebase's client config; the
// real gate is the preset's own server-side settings: allowed formats, max
// file size). Cloudinary flatly refuses "Overwrite" on unsigned presets
// (confirmed against the live API: "Cannot set overwrite to true in
// unsigned presets") -- allowing it would let anyone holding the public
// preset name overwrite any asset in the account by guessing its id. So
// each upload gets its own unique id instead of reusing one per member;
// Firestore's photoURL always points at whichever is newest, and the old
// one is simply orphaned (never deleted -- unsigned uploads can't delete
// either) rather than replaced. Under the free tier's 25GB this only
// matters if a member's photo gets re-edited an enormous number of times.
export async function uploadPhoto(blob, id) {
  if (!isCloudinaryConfigured) {
    throw new Error('Photo upload isn’t configured yet -- this deployment has no Cloudinary preset set up.');
  }
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('public_id', `member-photos/${id}-${Date.now()}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Photo upload failed -- please try again.');
  }
  const data = await response.json();
  return data.secure_url;
}
