const CLOUD_NAME = 'dxnk3mexu';
const UPLOAD_PRESET = 'linkerx_unsigned'; // create this in Cloudinary dashboard

export function getImageUrl(publicId: string, options: { width?: number; height?: number } = {}) {
  const { width, height } = options;
  let transform = '';
  if (width || height) {
    transform = [
      width ? `w_${width}` : '',
      height ? `h_${height}` : '',
      'c_fill',
    ].filter(Boolean).join(',') + '/';
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}${publicId}`;
}

export async function uploadImage(
  fileUri: string,
  folder: string = 'linkerx'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();

  // React Native / Expo file format
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return { url: data.secure_url, publicId: data.public_id };
}

export async function uploadImageFromWeb(
  file: File,
  folder: string = 'linkerx'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return { url: data.secure_url, publicId: data.public_id };
}
