const Conference = require('../models/Conference');
const User = require('../models/User');
const ConferenceForumPost = require('../models/ConferenceForumPost');

async function listPublicConferencePosts(req, res) {
  const conference = await Conference.findOne({ _id: req.params.conferenceId, isActive: true }).select('_id');
  if (!conference) return res.status(404).json({ message: 'Conference not found' });
  const posts = await ConferenceForumPost.find({ conference: conference._id })
    .populate('author', 'fullName email')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(200);
  return res.json(posts);
}

async function listMemberConferencePosts(req, res) {
  const me = await User.findById(req.user._id).select('conferences');
  if (!me) return res.status(404).json({ message: 'User not found' });
  const joined = Array.isArray(me.conferences) && me.conferences.some((id) => String(id) === req.params.conferenceId);
  if (!joined) return res.status(403).json({ message: 'You are not a member of this conference' });
  const posts = await ConferenceForumPost.find({ conference: req.params.conferenceId })
    .populate('author', 'fullName email')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(200);
  return res.json(posts);
}

async function createMemberConferencePost(req, res) {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'title and content are required' });
  const me = await User.findById(req.user._id).select('conferences');
  if (!me) return res.status(404).json({ message: 'User not found' });
  const joined = Array.isArray(me.conferences) && me.conferences.some((id) => String(id) === req.params.conferenceId);
  if (!joined) return res.status(403).json({ message: 'You are not a member of this conference' });
  const row = await ConferenceForumPost.create({
    conference: req.params.conferenceId,
    author: req.user._id,
    title: String(title).trim(),
    content: String(content).trim(),
  });
  const populated = await ConferenceForumPost.findById(row._id).populate('author', 'fullName email');
  return res.status(201).json(populated);
}

async function listSuperadminConferencePosts(req, res) {
  const posts = await ConferenceForumPost.find({ conference: req.params.conferenceId })
    .populate('author', 'fullName email')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(500);
  return res.json(posts);
}

async function createSuperadminConferencePost(req, res) {
  const { title, content, isPinned, isLocked } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'title and content are required' });
  const conference = await Conference.findById(req.params.conferenceId).select('_id');
  if (!conference) return res.status(404).json({ message: 'Conference not found' });
  const row = await ConferenceForumPost.create({
    conference: conference._id,
    author: req.user._id,
    title: String(title).trim(),
    content: String(content).trim(),
    isPinned: Boolean(isPinned),
    isLocked: Boolean(isLocked),
  });
  const populated = await ConferenceForumPost.findById(row._id).populate('author', 'fullName email');
  return res.status(201).json(populated);
}

async function removeSuperadminConferencePost(req, res) {
  const row = await ConferenceForumPost.findOneAndDelete({
    _id: req.params.postId,
    conference: req.params.conferenceId,
  });
  if (!row) return res.status(404).json({ message: 'Forum post not found' });
  return res.status(204).send();
}

module.exports = {
  listPublicConferencePosts,
  listMemberConferencePosts,
  createMemberConferencePost,
  listSuperadminConferencePosts,
  createSuperadminConferencePost,
  removeSuperadminConferencePost,
};
