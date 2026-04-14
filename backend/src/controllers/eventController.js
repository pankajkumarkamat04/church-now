const Event = require('../models/Event');
const Church = require('../models/Church');
const { assertChurchById } = require('../utils/assertChurch');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueEventSlug(churchId, base, excludeEventId) {
  let slug = base || 'event';
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const q = { church: churchId, slug: candidate };
    if (excludeEventId) q._id = { $ne: excludeEventId };
    const exists = await Event.findOne(q);
    if (!exists) return candidate;
    n += 1;
  }
}

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
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const homeOnly = req.query.home === '1' || req.query.home === 'true';
    const q = { church: church._id, published: true };
    if (homeOnly) q.featuredOnHome = true;
    const events = await Event.find(q).sort({ startsAt: -1, createdAt: -1 }).limit(limit);
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list events' });
  }
}

async function listPublicGlobal(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 40);
    const homeOnly = req.query.home === '1' || req.query.home === 'true';
    const q = { published: true };
    if (homeOnly) q.featuredOnHome = true;
    const events = await Event.find(q)
      .populate('church', 'name slug isActive')
      .sort({ startsAt: -1, createdAt: -1 })
      .limit(limit);
    const active = events.filter((ev) => ev.church && ev.church.isActive !== false);
    return res.json(active);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list events' });
  }
}

async function getPublicOne(req, res) {
  try {
    const { churchSlug, eventSlug } = req.params;
    const church = await Church.findOne({ slug: churchSlug, isActive: true });
    if (!church) {
      return res.status(404).json({ message: 'Church not found' });
    }
    const event = await Event.findOne({
      church: church._id,
      slug: eventSlug,
      published: true,
    });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load event' });
  }
}

async function listAdmin(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const events = await Event.find({ church: id }).sort({ startsAt: -1, createdAt: -1 });
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list events' });
  }
}

async function create(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const {
      title,
      slug,
      excerpt,
      description,
      startsAt,
      endsAt,
      location,
      imageUrl,
      published,
      featuredOnHome,
    } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const base = slugify(slug || title);
    const finalSlug = await uniqueEventSlug(id, base);
    const event = await Event.create({
      church: id,
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      description: description || '',
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      location: location || '',
      imageUrl: imageUrl || '',
      published: published !== false,
      featuredOnHome: Boolean(featuredOnHome),
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create event' });
  }
}

async function update(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const event = await Event.findOne({ _id: req.params.id, church: id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const fields = [
      'title',
      'excerpt',
      'description',
      'startsAt',
      'endsAt',
      'location',
      'imageUrl',
      'published',
      'featuredOnHome',
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        if (key === 'startsAt' || key === 'endsAt') {
          event[key] = req.body[key] ? new Date(req.body[key]) : null;
        } else {
          event[key] = req.body[key];
        }
      }
    }
    if (req.body.slug !== undefined) {
      const base = slugify(req.body.slug || event.title);
      if (base && base !== event.slug) {
        event.slug = await uniqueEventSlug(id, base, event._id);
      }
    }
    await event.save();
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update event' });
  }
}

async function remove(req, res) {
  try {
    const id = churchId(req);
    if (!id) {
      return res.status(400).json({ message: 'No church assigned' });
    }
    const event = await Event.findOneAndDelete({ _id: req.params.id, church: id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete event' });
  }
}

/** Superadmin: /api/superadmin/churches/:churchId/events */
async function listSuperadmin(req, res) {
  try {
    const cid = req.params.churchId;
    await assertChurchById(cid);
    const events = await Event.find({ church: cid }).sort({ startsAt: -1, createdAt: -1 });
    return res.json(events);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to list events' });
  }
}

async function getSuperadmin(req, res) {
  try {
    const { churchId, eventId } = req.params;
    await assertChurchById(churchId);
    const event = await Event.findOne({ _id: eventId, church: churchId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.json(event);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to load event' });
  }
}

async function createSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const {
      title,
      slug,
      excerpt,
      description,
      startsAt,
      endsAt,
      location,
      imageUrl,
      published,
      featuredOnHome,
    } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const base = slugify(slug || title);
    const finalSlug = await uniqueEventSlug(id, base);
    const event = await Event.create({
      church: id,
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      description: description || '',
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      location: location || '',
      imageUrl: imageUrl || '',
      published: published !== false,
      featuredOnHome: Boolean(featuredOnHome),
    });
    return res.status(201).json(event);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create event' });
  }
}

async function updateSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const event = await Event.findOne({ _id: req.params.eventId, church: id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const fields = [
      'title',
      'excerpt',
      'description',
      'startsAt',
      'endsAt',
      'location',
      'imageUrl',
      'published',
      'featuredOnHome',
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        if (key === 'startsAt' || key === 'endsAt') {
          event[key] = req.body[key] ? new Date(req.body[key]) : null;
        } else {
          event[key] = req.body[key];
        }
      }
    }
    if (req.body.slug !== undefined) {
      const base = slugify(req.body.slug || event.title);
      if (base && base !== event.slug) {
        event.slug = await uniqueEventSlug(id, base, event._id);
      }
    }
    await event.save();
    return res.json(event);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to update event' });
  }
}

async function removeSuperadmin(req, res) {
  try {
    const id = req.params.churchId;
    await assertChurchById(id);
    const event = await Event.findOneAndDelete({ _id: req.params.eventId, church: id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(204).send();
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete event' });
  }
}

module.exports = {
  listPublicGlobal,
  listPublic,
  getPublicOne,
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
