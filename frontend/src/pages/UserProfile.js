import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').slice(0, 100);
const getThumb  = (s) => s.thumbnailImage?.url || s.images?.[0]?.url || null;

export default function UserProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const [author, setAuthor]   = useState(null);
  const [stories, setStories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/stories/user/${userId}?page=${page}`);
      setAuthor(data.author);
      setStories(data.stories || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error || 'User not found.');
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><Navbar /><div className="loading">Loading profile…</div><Footer /></>;
  if (error)   return (
    <><Navbar />
    <div className="page-wrap">
      <p style={{ color:'#dc2626', marginTop:40 }}>{error}</p>
      <button onClick={() => navigate(-1)}
        style={{ marginTop:16, textDecoration:'underline', background:'none', border:'none', cursor:'pointer' }}>
        ← Back
      </button>
    </div>
    <Footer /></>
  );

  return (
    <div>
      <Navbar />
      <div className="page-wrap">

        {/* ── Profile Header ── */}
        <div className="profile-header">
          <div className="profile-avatar">
            {author.username?.[0]?.toUpperCase()}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{author.username}</h1>
            {author.bio && <p className="profile-bio">{author.bio}</p>}
            <div className="profile-meta">
              <span>📖 {pagination.total || 0} {pagination.total === 1 ? 'story' : 'stories'}</span>
              <span>Joined {new Date(author.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <hr style={{ border:'none', borderTop:'1px solid var(--gray-border)', margin:'28px 0' }} />

        {/* ── Stories Grid ── */}
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:20, marginBottom:20 }}>
          Stories by {author.username}
        </h2>

        {stories.length === 0 ? (
          <div className="empty-state"><p>No published stories yet.</p></div>
        ) : (
          <div className="profile-stories-grid">
            {stories.map(s => (
              <div
                key={s._id}
                className="profile-story-card"
                onClick={() => navigate(`/stories/${s._id}`)}
              >
                <div className="profile-story-img">
                  {getThumb(s) ? (
                    <img src={getThumb(s)} alt={s.title} />
                  ) : (
                    <div className="profile-story-img-placeholder">No Photo</div>
                  )}
                </div>
                <div className="profile-story-body">
                  <div className="profile-story-title">{s.title}</div>
                  <div className="profile-story-excerpt">{stripHtml(s.body)}…</div>
                  <div className="profile-story-meta">
                    <span>{s.publishedAt ? new Date(s.publishedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : ''}</span>
                    <span>👁 {s.viewCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>← Previous</button>
            <span>Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next →</button>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
