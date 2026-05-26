const CLOUD_NAME    = 'dxnk3mexu';
const UPLOAD_PRESET = 'linkerx_unsigned';

// ─── URL helpers ─────────────────────────────────────────────────────────────

export function getImageUrl(
  publicId: string,
  options: { width?: number; height?: number } = {}
) {
  const { width, height } = options;
  let transform = '';
  if (width || height) {
    transform =
      [width ? `w_${width}` : '', height ? `h_${height}` : '', 'c_fill']
        .filter(Boolean)
        .join(',') + '/';
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}${publicId}`;
}

// ─── Mobile image upload (Expo / React Native) ───────────────────────────────

export async function uploadImage(
  fileUri: string,
  folder = 'linkerx'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', { uri: fileUri, type: 'image/jpeg', name: 'upload.jpg' } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Image upload failed');
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

// ─── Web image upload (File object) ──────────────────────────────────────────

export async function uploadImageFromWeb(
  file: File,
  folder = 'linkerx'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Image upload failed');
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

// ─── Mobile raw file upload (documents, pdf, etc.) ───────────────────────────

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  folder = 'linkerx/files'
): Promise<{ url: string; publicId: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', { uri: fileUri, type: mimeType, name: fileName } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);
  // resource_type=raw for non-image files
  formData.append('resource_type', 'raw');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'File upload failed');
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id, fileName };
}

// ─── Web raw file upload (File object) ───────────────────────────────────────

export async function uploadFileFromWeb(
  file: File,
  folder = 'linkerx/files'
): Promise<{ url: string; publicId: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // Use image endpoint for images, raw for everything else
  const isImage = file.type.startsWith('image/');
  const endpoint = isImage ? 'image' : 'raw';

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'File upload failed');
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id, fileName: file.name };
}
