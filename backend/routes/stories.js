const express = require('express');
const Story = require('../models/Story');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/stories — public feed, paginated ──
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 6);
    const skip  = (page - 1) * limit;
    const filter = { status: 'published' };
    if (req.query.tag)    filter.tags   = req.query.tag;
    if (req.query.search) filter.$text  = { $search: req.query.search };

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .populate('author', 'username avatar')
        .select('-body -editHistory -bodyHash')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Story.countDocuments(filter),
    ]);
    res.json({ stories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stories.' });
  }
});

// ── GET /api/stories/latest ──
router.get('/latest', async (req, res) => {
  try {
    const stories = await Story.find({ status: 'published' })
      .populate('author', 'username avatar')
      .select('title body tags images thumbnailImage publishedAt author viewCount')
      .sort({ publishedAt: -1 })
      .limit(4);
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest stories.' });
  }
});

// ── GET /api/stories/my ──
router.get('/my', protect, async (req, res) => {
  try {
    const stories = await Story.find({ author: req.user._id })
      .select('title status tags images thumbnailImage publishedAt createdAt viewCount')
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your stories.' });
  }
});

// ── GET /api/stories/:id ──
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('author', 'username avatar bio');
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    if (story.status !== 'published') {
      return res.status(403).json({ error: 'This story is not published yet.' });
    }
    Story.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();
    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story.' });
  }
});

// ── GET /api/stories/:id/edit — fetch own story for editing (draft or published) ──
router.get('/:id/edit', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed.' });
    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story.' });
  }
});

// ── POST /api/stories ──
router.post('/', protect, async (req, res) => {
  try {
    const { title, body, tags, thumbnailImage, images, videos, pdfs, externalRefs } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });
    const story = await Story.create({
      title: title.trim(), body, tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      thumbnailImage: thumbnailImage || { fileKey: '', displayName: '', url: '', altText: '' },
      images: images || [], videos: videos || [], pdfs: pdfs || [],
      externalRefs: externalRefs || [], author: req.user._id, status: 'draft',
    });
    res.status(201).json({ message: 'Story saved as draft.', story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create story.' });
  }
});

// ── PATCH /api/stories/:id ──
router.patch('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed.' });

    if (req.body.body && req.body.body !== story.body) {
      story.editHistory.push({ editorId: req.user._id, bodySnapshot: story.body, bodyHash: story.bodyHash, editedAt: new Date() });
      story.contentVersion += 1;
    }

    const allowed = ['title', 'body', 'tags', 'thumbnailImage', 'images', 'videos', 'pdfs', 'externalRefs', 'status'];
    allowed.forEach(field => { if (req.body[field] !== undefined) story[field] = req.body[field]; });

    await story.save();
    res.json({ message: 'Story updated.', story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

// ── POST /api/stories/:id/publish ──
router.post('/:id/publish', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed.' });
    story.status = 'published';
    story.publishedAt = new Date();
    story.bodyHash = story.computeBodyHash();
    await story.save();
    res.json({ message: 'Story published!', story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish story.' });
  }
});

// ── DELETE /api/stories/:id ──
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed.' });
    await story.deleteOne();
    res.json({ message: 'Story deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

// ── GET /api/stories/user/:userId — public stories by a user ──
router.get('/user/:userId', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 9;
    const skip  = (page - 1) * limit;

    const [stories, total, author] = await Promise.all([
      Story.find({ author: req.params.userId, status: 'published' })
        .populate('author', 'username bio avatar')
        .select('title body images thumbnailImage publishedAt viewCount author')
        .sort({ publishedAt: -1 })
        .skip(skip).limit(limit),
      Story.countDocuments({ author: req.params.userId, status: 'published' }),
      require('../models/User').findById(req.params.userId).select('username bio avatar createdAt'),
    ]);

    if (!author) return res.status(404).json({ error: 'User not found.' });
    res.json({ author, stories, pagination: { page, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router;
