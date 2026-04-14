const GalleryItem = require('../models/GalleryItem');
const Church = require('../models/Church');
const { assertChurchById } = require('../utils/assertChurch');

function churchId(req) {
  return req.user?.church;
}

async function listPublic(req, res) {
  try {
    const { churchSlug } = req.params;
    const church = await Church.findOne({ slug: churchSlug, isActive: true });
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    const limit = Math.min(Number(req.query.limit) || 80, 120);
    const homeOnly = req.query.home === '1' || req.query.home === 'true';
    const q = { church: church._id, published: true };
    if (homeOnly) q.showOnHome = true;
    const items = await GalleryItem.find(q).sort({ sortOrder: 1, createdAt: -1 }).limit(limit);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list gallery' });
  }
}

async function listPublicGlobal(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 18, 60);
    const homeOnly = req.query.home === '1' || req.query.home === 'true';
    const q = { published: true };
    if (homeOnly) q.showOnHome = true;
    const items = await GalleryItem.find(q)
      .populate('church', 'name slug isActive')
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit);
    const active = items.filter((item) => item.church && item.church.isActive !== false);
    return res.json(active);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list gallery' });
  }
}

async function listAdmin(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const items = await GalleryItem.find({ church: id }).sort({ sortOrder: 1, createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list gallery' });
  }
}

async function create(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const { title, imageUrl, caption, sortOrder, published, showOnHome } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }
    const item = await GalleryItem.create({
      church: id,
      title: title || '',
      imageUrl,
      caption: caption || '',
      sortOrder: Number(sortOrder) || 0,
      published: published !== false,
      showOnHome: Boolean(showOnHome),
    });
    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create gallery item' });
  }
}

async function update(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const item = await GalleryItem.findOne({ _id: req.params.id, church: id });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    const fields = ['title', 'imageUrl', 'caption', 'sortOrder', 'published', 'showOnHome'];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        item[key] = key === 'sortOrder' ? Number(req.body[key]) : req.body[key];
      }
    }
    await item.save();
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update gallery item' });
  }
}

async function remove(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const item = await GalleryItem.findOneAndDelete({ _id: req.params.id, church: id });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete gallery item' });
  }
}

/** Superadmin: /api/superadmin/churches/:churchId/gallery */
async function listSuperadmin(req, res) {
  try {
    const cid = req.params.churchId;
    await assertChurchById(cid);
    const items = await GalleryItem.find({ church: cid }).sort({ sortOrder: 1, createdAt: -1 });
    return res.json(items);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to list gallery' });
  }
}

async function getSuperadmin(req, res) {
  try {
    const { churchId, itemId } = req.params;
    await assertChurchById(churchId);
    const item = await GalleryItem.findOne({ _id: itemId, church: churchId });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json(item);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to load gallery item' });
  }
}

async function createSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const { title, imageUrl, caption, sortOrder, published, showOnHome } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }
    const item = await GalleryItem.create({
      church: id,
      title: title || '',
      imageUrl,
      caption: caption || '',
      sortOrder: Number(sortOrder) || 0,
      published: published !== false,
      showOnHome: Boolean(showOnHome),
    });
    return res.status(201).json(item);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create gallery item' });
  }
}

async function updateSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const item = await GalleryItem.findOne({ _id: req.params.itemId, church: id });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    const fields = ['title', 'imageUrl', 'caption', 'sortOrder', 'published', 'showOnHome'];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        item[key] = key === 'sortOrder' ? Number(req.body[key]) : req.body[key];
      }
    }
    await item.save();
    return res.json(item);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to update gallery item' });
  }
}

async function removeSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const item = await GalleryItem.findOneAndDelete({ _id: req.params.itemId, church: id });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.status(204).send();
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete gallery item' });
  }
}

module.exports = {
  listPublicGlobal,
  listPublic,
  listAdmin,
  create,
  update,
  remove,
  listSuperadmin,
  getSuperadmin,
  createSuperadmin,
  updateSuperadmin,
  removeSuperadmin,
};
