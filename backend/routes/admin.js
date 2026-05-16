const express = require('express');
const Story   = require('../models/Story');
const User    = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All admin routes require login + admin role
router.use(protect, restrictTo('admin'));

// ── GET /api/admin/stats ──
router.get('/stats', async (req, res) => {
  try {
    const [totalStories, publishedStories, draftStories, totalUsers] = await Promise.all([
      Story.countDocuments(),
      Story.countDocuments({ status: 'published' }),
      Story.countDocuments({ status: 'draft' }),
      User.countDocuments(),
    ]);
    const topStories = await Story.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount author publishedAt')
      .populate('author', 'username');
    res.json({ totalStories, publishedStories, draftStories, totalUsers, topStories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ── GET /api/admin/stories ──
router.get('/stories', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 15;
    const skip  = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$text  = { $search: req.query.search };

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .populate('author', 'username email')
        .select('title status publishedAt createdAt viewCount author thumbnailImage')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit),
      Story.countDocuments(filter),
    ]);
    res.json({ stories, pagination: { page, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories.' });
  }
});

// ── DELETE /api/admin/stories/:id ──
router.delete('/stories/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    res.json({ message: 'Story deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

// ── PATCH /api/admin/stories/:id/status ──
router.patch('/stories/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['published', 'draft'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'published' ? { publishedAt: new Date() } : { publishedAt: null }) },
      { new: true }
    );
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    res.json({ message: `Story ${status}.`, story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

// ── GET /api/admin/users ──
router.get('/users', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 15;
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    // attach story count per user
    const userIds = users.map(u => u._id);
    const storyCounts = await Story.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: '$author', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    storyCounts.forEach(s => { countMap[s._id.toString()] = s.count; });
    const usersWithCount = users.map(u => ({ ...u.toObject(), storyCount: countMap[u._id.toString()] || 0 }));
    res.json({ users: usersWithCount, pagination: { page, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── PATCH /api/admin/users/:id/role ──
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['writer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Role updated.', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ── DELETE /api/admin/users/:id ──
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // also delete their stories
    await Story.deleteMany({ author: req.params.id });
    res.json({ message: 'User and their stories deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
