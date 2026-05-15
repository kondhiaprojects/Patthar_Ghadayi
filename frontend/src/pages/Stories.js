import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').slice(0, 160);
const readTime  = (html = '') => {
  const words = html.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

const getThumb = (s) => s.thumbnailImage?.url || s.images?.[0]?.url || null;

export default function Stories() {
  const [stories, setStories]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8 });
      if (search) params.set('search', search);
      const { data } = await axios.get(`/api/stories?${params}`);
      setStories(data.stories || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <Navbar />
      <div className="page-wrap">
        <h1 className="page-title">Stories</h1>
        <p className="page-subtitle">Real experiences from our community</p>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search stories…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {loading ? (
          <div className="loading">Loading stories…</div>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <p>{search ? `No stories found for "${search}"` : 'No stories published yet.'}</p>
          </div>
        ) : (
          <div className="stories-list">
            {stories.map(s => (
              <div
                key={s._id}
                className="story-list-item"
                onClick={() => navigate(`/stories/${s._id}`)}
              >
                <div className="story-list-thumb">
                  {getThumb(s) ? (
                    <img src={getThumb(s)} alt={s.title} />
                  ) : (
                    <div className="story-list-thumb-placeholder">No image</div>
                  )}
                </div>
                <div className="story-list-info">
                  <div className="story-list-title">{s.title}</div>
                  <div className="story-list-excerpt">{stripHtml(s.body)}</div>
                  <div className="story-list-meta">
                    <span>By {s.author?.username || 'Unknown'}</span>
                    <span>{s.publishedAt ? new Date(s.publishedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : ''}</span>
                    <span>{readTime(s.body)}</span>
                    <span>👁 {s.viewCount || 0}</span>
                  </div>
                  {s.tags?.length > 0 && (
                    <div className="tags-row" style={{ marginTop: 8, marginBottom: 0 }}>
                      {s.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

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
