const fs = require('fs/promises');
const path = require('path');
const Church = require('../models/Church');

const CHURCH_LOGO_ROOT = path.join(process.cwd(), 'uploads', 'church-logos');

function normalizeString(value) {
  return String(value ?? '').trim();
}

function sanitizeFilename(name) {
  return String(name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function removePreviousLogo(previousUrl) {
  if (!previousUrl.includes('/uploads/church-logos/')) return;
  try {
    const oldFile = decodeURIComponent(previousUrl.split('/uploads/church-logos/')[1] || '');
    if (oldFile) {
      await fs.unlink(path.join(CHURCH_LOGO_ROOT, path.basename(oldFile)));
    }
  } catch {
    // Best-effort cleanup only.
  }
}

async function uploadChurchLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }
    const churchId = normalizeString(req.params.churchId || req.params.id);
    if (!churchId) {
      return res.status(400).json({ message: 'churchId is required' });
    }

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }

    await fs.mkdir(CHURCH_LOGO_ROOT, { recursive: true });

    const ext = path.extname(req.file.originalname || '') || '';
    const base = sanitizeFilename(path.basename(req.file.originalname || 'logo', ext)) || 'logo';
    const finalName = `${churchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext.toLowerCase()}`;
    const finalPath = path.join(CHURCH_LOGO_ROOT, finalName);

    await fs.rename(req.file.path, finalPath);

    const previousUrl = normalizeString(church.logoUrl);
    church.logoUrl = `${req.protocol}://${req.get('host')}/uploads/church-logos/${encodeURIComponent(finalName)}`;
    await church.save();

    if (previousUrl) await removePreviousLogo(previousUrl);

    return res.status(201).json(church);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to upload church logo' });
  }
}

module.exports = {
  uploadChurchLogo,
};
