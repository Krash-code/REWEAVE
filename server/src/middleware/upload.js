import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
const allowedTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(uploadDirectory, { recursive: true }).then(() => callback(null, uploadDirectory), callback);
  },
  filename(_req, file, callback) {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.get(extension) !== file.mimetype) {
      const error = new Error('Photos must be JPG, PNG, or WEBP images');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

export async function removeFiles(files = []) {
  await Promise.all(files.map((file) => unlink(file.path).catch(() => {})));
}

export async function removePhotoUrls(urls = []) {
  await Promise.all(urls.map((url) => {
    const filename = path.basename(url);
    if (!filename || filename === '.' || filename === path.sep) return Promise.resolve();
    return unlink(path.join(uploadDirectory, filename)).catch(() => {});
  }));
}

export function uploadPhotos(req, res, next) {
  upload.array('photos', 5)(req, res, async (error) => {
    if (!error) return next();

    await removeFiles(req.files || []);
    const status = error.statusCode || (error instanceof multer.MulterError ? 400 : 500);
    return res.status(status).json({
      success: false,
      message: error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Each photo must be 5 MB or smaller'
        : error.message,
      errors: [{ field: 'photos', message: error.message }]
    });
  });
}