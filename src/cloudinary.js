const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Uploads directly from the browser via an *unsigned* preset -- cloud name +
// preset name are not secret (same model as Firebase's client config; the
// real gate is the preset's own server-side settings: allowed formats, max
// file size, "Overwrite" + "Unique filename" off so repeat edits replace the
// same asset instead of piling up new ones under the free tier's storage cap).
export async function uploadPhoto(blob, id) {
  if (!isCloudinaryConfigured) {
    throw new Error('Photo upload isn’t configured yet -- this deployment has no Cloudinary preset set up.');
  }
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('public_id', `member-photos/${id}`);

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
