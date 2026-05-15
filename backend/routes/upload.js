const express    = require('express');
const multer     = require('multer');
const { protect } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const router = express.Router();

// ── Cloudinary config (reads from env vars) ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Allowed MIME types ──
const ALLOWED = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  pdf:   ['application/pdf'],
};

// ── Use memory storage (no disk) ──
const memStorage = multer.memoryStorage();

const fileFilter = (allowed) => (req, file, cb) => {
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const uploadImage = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED.image),
});

const uploadVideo = multer({
  storage: memStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED.video),
});

const uploadPdf = multer({
  storage: memStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED.pdf),
});

// ── Helper: upload buffer to Cloudinary ──
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ── POST /api/upload/image ──
router.post('/image', protect, (req, res) => {
  uploadImage.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'storyvault/images',
        resource_type: 'image',
      });

      res.json({
        fileKey:     result.public_id,
        displayName: req.file.originalname,
        url:         result.secure_url,
        altText:     '',
      });
    } catch (uploadErr) {
      console.error('Cloudinary image upload error:', uploadErr);
      res.status(500).json({ error: 'Failed to upload image.' });
    }
  });
});

// ── POST /api/upload/video ──
router.post('/video', protect, (req, res) => {
  uploadVideo.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'storyvault/videos',
        resource_type: 'video',
      });

      res.json({
        fileKey:       result.public_id,
        displayName:   req.file.originalname,
        url:           result.secure_url,
        posterUrl:     null,
        fileSizeBytes: req.file.size,
      });
    } catch (uploadErr) {
      console.error('Cloudinary video upload error:', uploadErr);
      res.status(500).json({ error: 'Failed to upload video.' });
    }
  });
});

// ── POST /api/upload/pdf ──
router.post('/pdf', protect, (req, res) => {
  uploadPdf.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'storyvault/pdfs',
        resource_type: 'raw',
      });

      res.json({
        fileKey:       result.public_id,
        displayName:   req.file.originalname,
        url:           result.secure_url,
        fileSizeBytes: req.file.size,
      });
    } catch (uploadErr) {
      console.error('Cloudinary PDF upload error:', uploadErr);
      res.status(500).json({ error: 'Failed to upload PDF.' });
    }
  });
});

module.exports = router;
