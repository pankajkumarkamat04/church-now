const SystemSetting = require('../models/SystemSetting');
const fs = require('fs/promises');
const path = require('path');

const DEFAULT_SETTINGS = {
  systemName: 'Church OS',
  systemLogoUrl: '',
  supportEmail: '',
  supportPhone: '',
  websiteUrl: '',
  address: '',
  footerText: '',
};

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

const SYSTEM_LOGO_ROOT = path.join(process.cwd(), 'uploads', 'system-logos');

function toClientPayload(doc) {
  const base = doc || {};
  return {
    systemName: normalizeString(base.systemName) || DEFAULT_SETTINGS.systemName,
    systemLogoUrl: normalizeString(base.systemLogoUrl),
    supportEmail: normalizeString(base.supportEmail),
    supportPhone: normalizeString(base.supportPhone),
    websiteUrl: normalizeString(base.websiteUrl),
    address: normalizeString(base.address),
    footerText: normalizeString(base.footerText),
  };
}

async function getOrCreateSettings() {
  let row = await SystemSetting.findOne({ singletonKey: 'default' });
  if (!row) {
    row = await SystemSetting.create({ singletonKey: 'default', ...DEFAULT_SETTINGS });
  }
  return row;
}

async function getPublicSystemSettings(_req, res) {
  try {
    const row = await SystemSetting.findOne({ singletonKey: 'default' }).lean();
    return res.json(toClientPayload(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load system settings' });
  }
}

async function getSystemSettings(_req, res) {
  try {
    const row = await getOrCreateSettings();
    return res.json(toClientPayload(row.toObject ? row.toObject() : row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load system settings' });
  }
}

async function updateSystemSettings(req, res) {
  try {
    const allowedKeys = [
      'systemName',
      'systemLogoUrl',
      'supportEmail',
      'supportPhone',
      'websiteUrl',
      'address',
      'footerText',
    ];
    const updates = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        updates[key] = normalizeString(req.body[key]);
      }
    }
    if (updates.systemName !== undefined && !updates.systemName) {
      return res.status(400).json({ message: 'System name is required' });
    }
    const row = await SystemSetting.findOneAndUpdate(
      { singletonKey: 'default' },
      { $set: updates, $setOnInsert: { singletonKey: 'default' } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    return res.json(toClientPayload(row.toObject ? row.toObject() : row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update system settings' });
  }
}

async function uploadSystemLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }
    await fs.mkdir(SYSTEM_LOGO_ROOT, { recursive: true });

    const ext = path.extname(req.file.originalname || '') || '';
    const base = sanitizeFilename(path.basename(req.file.originalname || 'logo', ext)) || 'logo';
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext.toLowerCase()}`;
    const finalPath = path.join(SYSTEM_LOGO_ROOT, finalName);

    await fs.rename(req.file.path, finalPath);

    const row = await getOrCreateSettings();
    const previousUrl = normalizeString(row.systemLogoUrl);
    row.systemLogoUrl = `${req.protocol}://${req.get('host')}/uploads/system-logos/${encodeURIComponent(finalName)}`;
    await row.save();

    if (previousUrl.includes('/uploads/system-logos/')) {
      try {
        const oldFile = decodeURIComponent(previousUrl.split('/uploads/system-logos/')[1] || '');
        if (oldFile) {
          await fs.unlink(path.join(SYSTEM_LOGO_ROOT, path.basename(oldFile)));
        }
      } catch {
        // Best-effort cleanup only.
      }
    }

    return res.status(201).json(toClientPayload(row.toObject ? row.toObject() : row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to upload system logo' });
  }
}

module.exports = {
  getPublicSystemSettings,
  getSystemSettings,
  updateSystemSettings,
  uploadSystemLogo,
};
