const mongoose = require('mongoose');
const crypto = require('crypto');

const externalRefSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  url:   { type: String, required: true, trim: true },
}, { _id: false });

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title must be at most 150 characters'],
  },
  body: {
    type: String,
    required: [true, 'Story body is required'],
  },
  bodyHash: {
    type: String, // SHA-256 of body at publish time — tamper detection
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  tags: {
    type: [String],
    default: [],
    validate: [arr => arr.length <= 10, 'Maximum 10 tags allowed'],
  },
  // Media
  images: [{
    fileKey:     { type: String },  // UUID filename on disk
    displayName: { type: String },
    altText:     { type: String, default: '' },
    url:         { type: String },  // served URL
  }],
  videos: [{
    fileKey:      { type: String },
    displayName:  { type: String },
    url:          { type: String },
    posterUrl:    { type: String, default: null },
    fileSizeBytes:{ type: Number },
  }],
  pdfs: [{
    fileKey:      { type: String },
    displayName:  { type: String },
    url:          { type: String },
    fileSizeBytes:{ type: Number },
  }],
  externalRefs: {
    type: [externalRefSchema],
    default: [],
    validate: [arr => arr.length <= 20, 'Maximum 20 external references allowed'],
  },

  // Metadata
  viewCount:      { type: Number, default: 0 },
  contentVersion: { type: Number, default: 1 },
  publishedAt:    { type: Date, default: null },

  // Edit history stored as sub-docs
  editHistory: [{
    editorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bodySnapshot:{ type: String },
    bodyHash:    { type: String },
    editedAt:    { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Compute SHA-256 hash of body
storySchema.methods.computeBodyHash = function () {
  return crypto.createHash('sha256').update(this.body).digest('hex');
};

// Text index for full-text search
storySchema.index({ title: 'text', body: 'text', tags: 'text' });

module.exports = mongoose.model('Story', storySchema);
