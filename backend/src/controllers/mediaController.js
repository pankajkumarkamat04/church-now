const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');

const MEDIA_ROOT = path.join(process.cwd(), 'uploads', 'media');

function sanitizeFilename(name) {
  return String(name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(MEDIA_ROOT, { recursive: true });
      cb(null, MEDIA_ROOT);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    const base = sanitizeFilename(path.basename(file.originalname || 'file', ext)) || 'file';
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${stamp}-${rand}-${base}${ext.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function toMediaResponse(req, file) {
  const host = `${req.protocol}://${req.get('host')}`;
  return {
    name: file.name,
    url: `${host}/uploads/media/${encodeURIComponent(file.name)}`,
    size: file.size,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
  };
}

async function list(req, res) {
  await fs.mkdir(MEDIA_ROOT, { recursive: true });
  const dirents = await fs.readdir(MEDIA_ROOT, { withFileTypes: true });
  const files = [];

  for (const d of dirents) {
    if (!d.isFile()) continue;
    const filePath = path.join(MEDIA_ROOT, d.name);
    const stat = await fs.stat(filePath);
    files.push({
      name: d.name,
      size: stat.size,
      mimeType: '',
      uploadedAt: stat.mtime.toISOString(),
    });
  }

  files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  return res.json(files.slice(0, limit).map((f) => toMediaResponse(req, f)));
}

async function uploadOne(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }
  return res.status(201).json(
    toMediaResponse(req, {
      name: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype || '',
      uploadedAt: new Date().toISOString(),
    })
  );
}

async function remove(req, res) {
  const fileName = path.basename(req.params.fileName || '');
  if (!fileName) {
    return res.status(400).json({ message: 'fileName is required' });
  }
  const filePath = path.join(MEDIA_ROOT, fileName);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'File not found' });
    }
    throw error;
  }
  return res.status(204).send();
}

module.exports = {
  upload,
  list,
  uploadOne,
  remove,
};
