const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const storyRoutes = require('./routes/stories');
const uploadRoutes = require('./routes/upload');
const adminRoutes  = require('./routes/admin');

const app = express();

// ── Security middleware ──
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ──
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
}));

// ── Body parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for uploads ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin',  adminRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Connect to MongoDB ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
