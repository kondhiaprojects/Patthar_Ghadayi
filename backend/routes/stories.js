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

    // Tag filter
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // Full-text search
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .populate('author', 'username avatar')
        .select('-body -editHistory -bodyHash')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Story.countDocuments(filter),
    ]);

    res.json({
      stories,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stories.' });
  }
});

// ── GET /api/stories/latest — 4 most recent for homepage ──
router.get('/latest', async (req, res) => {
  try {
    const stories = await Story.find({ status: 'published' })
      .populate('author', 'username avatar')
      .select('title body tags images publishedAt author viewCount')
      .sort({ publishedAt: -1 })
      .limit(4);
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest stories.' });
  }
});

// ── GET /api/stories/my — logged-in user's own stories ──
router.get('/my', protect, async (req, res) => {
  try {
    const stories = await Story.find({ author: req.user._id })
      .select('title status tags images publishedAt createdAt viewCount')
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your stories.' });
  }
});

// ── GET /api/stories/:id — single story, increment view count ──
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'username avatar bio');

    if (!story) return res.status(404).json({ error: 'Story not found.' });
    if (story.status !== 'published') {
      // Allow author to preview their own draft
      return res.status(403).json({ error: 'This story is not published yet.' });
    }

    // Increment view count (fire-and-forget)
    Story.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story.' });
  }
});

// ── POST /api/stories — create draft (auth required) ──
router.post('/', protect, async (req, res) => {
  try {
    const { title, body, tags, images, videos, pdfs, externalRefs } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required.' });
    }

    const story = await Story.create({
      title: title.trim(),
      body,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      images: images || [],
      videos: videos || [],
      pdfs:   pdfs   || [],
      externalRefs: externalRefs || [],
      author: req.user._id,
      status: 'draft',
    });

    res.status(201).json({ message: 'Story saved as draft.', story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create story.' });
  }
});

// ── PATCH /api/stories/:id — edit (author or admin only) ──
router.patch('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });

    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not allowed to edit this story.' });
    }

    // Save current body to edit history before overwriting
    if (req.body.body && req.body.body !== story.body) {
      story.editHistory.push({
        editorId:     req.user._id,
        bodySnapshot: story.body,
        bodyHash:     story.bodyHash,
        editedAt:     new Date(),
      });
      story.contentVersion += 1;
    }

    const allowed = ['title', 'body', 'tags', 'images', 'videos', 'pdfs', 'externalRefs'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) story[field] = req.body[field];
    });

    await story.save();
    res.json({ message: 'Story updated.', story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

// ── POST /api/stories/:id/publish — publish a draft ──
router.post('/:id/publish', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });

    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not allowed to publish this story.' });
    }

    story.status      = 'published';
    story.publishedAt = new Date();
    story.bodyHash    = story.computeBodyHash();
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
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not allowed to delete this story.' });
    }

    await story.deleteOne();
    res.json({ message: 'Story deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

module.exports = router;
