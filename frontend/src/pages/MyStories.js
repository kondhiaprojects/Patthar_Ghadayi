import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const getThumb = (s) => s.thumbnailImage?.url || s.images?.[0]?.url || null;

export default function MyStories() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    axios.get('/api/stories/my')
      .then(({ data }) => setStories(data.stories || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/stories/${id}`);
      setStories(prev => prev.filter(s => s._id !== id));
      setMsg('Story deleted.');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to delete story.');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-wrap">
        <h1 className="page-title">My Stories</h1>
        {msg && <div className="success-msg" style={{ marginBottom: 16 }}>{msg}</div>}

        {loading ? (
          <div className="loading">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <p>You haven't written any stories yet.</p>
            <Link to="/post" style={{ display:'inline-block', marginTop:16, color:'#2d5016', textDecoration:'underline' }}>
              Write your first story →
            </Link>
          </div>
        ) : (
          <div className="stories-list">
            {stories.map(s => (
              <div key={s._id} className="story-list-item" style={{ cursor: 'default' }}>
                <div className="story-list-thumb">
                  {getThumb(s) ? (
                    <img src={getThumb(s)} alt={s.title} />
                  ) : (
                    <div className="story-list-thumb-placeholder">No image</div>
                  )}
                </div>
                <div className="story-list-info">
                  <div className="story-list-title">{s.title}</div>
                  <div className="story-list-meta">
                    <span style={{
                      background: s.status === 'published' ? '#f0fdf4' : '#fef9c3',
                      color: s.status === 'published' ? '#16a34a' : '#92400e',
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600
                    }}>
                      {s.status === 'published' ? '● Published' : '○ Draft'}
                    </span>
                    {s.publishedAt && <span>{new Date(s.publishedAt).toLocaleDateString('en-IN')}</span>}
                    <span>👁 {s.viewCount || 0}</span>
                  </div>
                  <div style={{ display:'flex', gap:16, marginTop:8 }}>
                    {s.status === 'published' && (
                      <button
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#2d5016', textDecoration:'underline' }}
                        onClick={() => navigate(`/stories/${s._id}`)}
                      >View</button>
                    )}
                    <button
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#2563eb', textDecoration:'underline' }}
                      onClick={() => navigate(`/edit/${s._id}`)}
                    >Edit</button>
                    <button
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#dc2626', textDecoration:'underline' }}
                      onClick={() => handleDelete(s._id)}
                    >Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
