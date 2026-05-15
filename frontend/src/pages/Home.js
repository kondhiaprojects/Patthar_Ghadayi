import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── helper: strip html tags for excerpt ──
const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').slice(0, 120);

export default function Home() {
  const [stories, setStories] = useState([]);
  const [stats, setStats]     = useState({ total: 0, writers: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, allRes] = await Promise.all([
          axios.get('/api/stories/latest'),
          axios.get('/api/stories?limit=1'),
        ]);
        setStories(latestRes.data.stories || []);
        setStats({ total: allRes.data.pagination?.total || 0, writers: 0 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <Navbar />

      {/* ── Hero / Image with Stats ── */}
      <div className="hero-placeholder">
        {/* Replace this div's content with your own image */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, marginBottom: 16 }}>📷 Hero image — update the URL below</p>
          {/* <img src="YOUR_IMAGE_URL_HERE" alt="hero" style={{width:'100%',height:'220px',objectFit:'cover'}} /> */}
          <div className="hero-stats" style={{ marginTop: 0 }}>
            <div className="hero-stat">
              <div className="hero-stat-num">{stats.total}+</div>
              <div className="hero-stat-label">Stories Shared</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">200+</div>
              <div className="hero-stat-label">Community Members</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">Free to Read</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── About ── */}
      <div className="about-section">
        <h2>About</h2>
        {/* ⬇️  Replace this placeholder text with your own content */}
        <p>
          StoryVault is a private community platform where members share their real-world
          experiences — from travel adventures and career milestones to personal reflections
          and everyday discoveries. Anyone can read; only registered members can write.
          Update this text in <code>src/pages/Home.js</code>.
        </p>
      </div>

      {/* ── Your Stories ── */}
      <div className="stories-section">
        <h2>Your Stories</h2>

        {loading ? (
          <div className="loading">Loading stories…</div>
        ) : stories.length === 0 ? (
          <div className="empty-state"><p>No stories yet. Be the first to share one!</p></div>
        ) : (
          <div className="story-grid">
            {stories.map((s, i) => (
              <div
                key={s._id}
                className={`story-card ${i === 2 ? 'featured' : ''}`}
                onClick={() => navigate(`/stories/${s._id}`)}
              >
                <div className="story-card-img">
                  {s.images?.[0]?.url ? (
                    <img src={s.images[0].url} alt={s.images[0].altText || s.title} />
                  ) : (
                    <div className="story-card-img-placeholder">Photo</div>
                  )}
                </div>
                <div className="story-card-content">
                  <div className="story-card-name">{s.title}</div>
                  <div className="story-card-excerpt">{stripHtml(s.body)}</div>
                  <span className="story-card-readmore">Read more…</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="read-more-btn" onClick={() => navigate('/stories')}>
          Read more stories
        </button>
      </div>

      <Footer />
    </div>
  );
}
