/**
 * Cloudinary Upload Helper
 * =========================
 * Handles unsigned image uploads to Cloudinary from the browser.
 * 
 * Cloud Name: ddgmira6z
 * Upload Preset: ascend_avatars (must be created as UNSIGNED in Cloudinary console)
 */

const CLOUD_NAME = 'ddgmira6z';
const UPLOAD_PRESET = 'ascend_avatars';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a file (image) to Cloudinary using an unsigned upload preset.
 * 
 * @param {File} file - The image file to upload (from an <input type="file">)
 * @param {Object} options - Optional configuration
 * @param {string} options.folder - Cloudinary folder path (default: 'ascend/avatars')
 * @param {Function} options.onProgress - Progress callback (receives 0-100)
 * @returns {Promise<{ secure_url: string, public_id: string, width: number, height: number }>}
 */
export const uploadToCloudinary = async (file, options = {}) => {
  const { folder = 'ascend/avatars', onProgress } = options;

  // Validate file
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`);
  }

  // Validate file size (max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB limit.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // If a progress callback is provided, use XMLHttpRequest for progress tracking
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_URL);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id,
            width: data.width,
            height: data.height,
          });
        } else {
          let errMsg = `Cloudinary upload failed with status ${xhr.status}`;
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData.error?.message) {
              errMsg = `${errData.error.message} (Status ${xhr.status})`;
            }
          } catch {
            // ignore invalid JSON parsing error
          }
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during Cloudinary upload.'));
      });

      xhr.send(formData);
    });
  }

  // Simple fetch-based upload (no progress tracking)
  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Cloudinary upload failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    width: data.width,
    height: data.height,
  };
};

/**
 * Generate an optimized Cloudinary delivery URL from a public_id.
 * Applies automatic format and quality optimizations.
 * 
 * @param {string} publicId - The Cloudinary public ID
 * @param {Object} transforms - Transformation options
 * @param {number} transforms.width - Desired width
 * @param {number} transforms.height - Desired height
 * @param {string} transforms.crop - Crop mode (default: 'fill')
 * @returns {string} Optimized URL
 */
export const getOptimizedUrl = (publicId, transforms = {}) => {
  const { width = 256, height = 256, crop = 'fill' } = transforms;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_${crop},w_${width},h_${height},f_auto,q_auto/${publicId}`;
};
