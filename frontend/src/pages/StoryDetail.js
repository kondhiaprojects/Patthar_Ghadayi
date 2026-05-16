import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  return text.replace(urlRegex, url =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2d5a3d;text-decoration:underline;">${url}</a>`
  );
}

async function downloadPdf(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank');
  }
}

// ── Lightbox component ──
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  const prev = (e) => { e.stopPropagation(); setCurrent(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCurrent(i => (i + 1) % images.length); };

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>×</button>

      {images.length > 1 && (
        <button className="lightbox-arrow lightbox-prev" onClick={prev}>‹</button>
      )}

      <div className="lightbox-img-wrap" onClick={e => e.stopPropagation()}>
        <img src={images[current].url} alt={images[current].altText || `Photo ${current + 1}`} className="lightbox-img" />
        {images.length > 1 && (
          <div className="lightbox-counter">{current + 1} / {images.length}</div>
        )}
      </div>

      {images.length > 1 && (
        <button className="lightbox-arrow lightbox-next" onClick={next}>›</button>
      )}
    </div>
  );
}

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`/api/stories/${id}`);
        setStory(data.story);
      } catch (err) {
        setError(err.response?.data?.error || 'Story not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <><Navbar /><div className="loading">Loading story…</div><Footer /></>;
  if (error)   return <><Navbar /><div className="page-wrap"><p style={{ color:'#dc2626', marginTop:40 }}>{error}</p><button onClick={() => navigate('/stories')} style={{ marginTop:16, textDecoration:'underline', background:'none', border:'none', cursor:'pointer' }}>← Back to Stories</button></div><Footer /></>;

  const readTime = Math.max(1, Math.round(story.body.replace(/<[^>]*>/g,'').split(/\s+/).length / 200));
  const processedBody = linkify(story.body);

  return (
    <div>
      <Navbar />

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          images={story.images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <div className="story-page">
        <button
          onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', fontSize:13, marginBottom:20 }}
        >← Back</button>

        {/* Cover thumbnail — constrained height, proper fit */}
        {story.thumbnailImage?.url && (
          <div className="story-thumbnail-wrap">
            <img src={story.thumbnailImage.url} alt={story.title} className="story-thumbnail" />
          </div>
        )}

        <div className="story-page-title">{story.title}</div>
        <div className="story-page-meta">
          <span>By <strong>{story.author?.username}</strong></span>
          <span>{story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''}</span>
          <span>{readTime} min read</span>
          <span>👁 {story.viewCount} views</span>
        </div>
        <hr className="story-page-divider" />

        <div className="story-page-body" dangerouslySetInnerHTML={{ __html: processedBody }} />

        {story.tags?.length > 0 && (
          <div className="story-tags">
            {story.tags.map(t => <span key={t} className="story-tag">#{t}</span>)}
          </div>
        )}

        {/* Story Photos — clickable grid with lightbox */}
        {story.images?.length > 0 && (
          <div className="story-media-section">
            <h3>Photos</h3>
            <div className="story-images-grid">
              {story.images.map((img, i) => (
                <div
                  key={i}
                  className="story-img-thumb"
                  onClick={() => setLightboxIdx(i)}
                  title="Click to enlarge"
                >
                  <img src={img.url} alt={img.altText || story.title} />
                  <div className="story-img-overlay">🔍</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {story.videos?.length > 0 && (
          <div className="story-media-section">
            <h3>Videos</h3>
            {story.videos.map((v, i) => (
              <div key={i} className="story-video-item">
                <video controls poster={v.posterUrl || undefined} preload="metadata">
                  <source src={v.url} />
                  Your browser does not support video playback.
                </video>
                <div className="story-video-label">{v.displayName}</div>
              </div>
            ))}
          </div>
        )}

        {/* PDFs */}
        {story.pdfs?.length > 0 && (
          <div className="story-media-section">
            <h3>Attachments</h3>
            {story.pdfs.map((pdf, i) => (
              <div key={i} className="pdf-item">
                <span className="pdf-item-icon">📄</span>
                <span className="pdf-item-name">{pdf.displayName}</span>
                <div className="pdf-item-links">
                  <a href={pdf.url} target="_blank" rel="noopener noreferrer">View PDF</a>
                  <button className="pdf-download-btn" onClick={() => downloadPdf(pdf.url, pdf.displayName)}>
                    Download .pdf
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* External Refs */}
        {story.externalRefs?.length > 0 && (
          <div className="story-media-section">
            <h3>External References</h3>
            {story.externalRefs.map((ref, i) => (
              <div key={i} className="ext-ref-item">
                <a
                  href={ref.url.startsWith('http') ? ref.url : `https://${ref.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ext-ref-link"
                >→ {ref.label}</a>
                <div className="ext-ref-url">{ref.url}</div>
              </div>
            ))}
          </div>
        )}

        {/* Author card */}
        <div style={{ marginTop:48, padding:'20px', border:'1px solid #e5e7eb', borderRadius:8, display:'flex', gap:14 }}>
          <div className="navbar-user-avatar" style={{ width:44, height:44, fontSize:16 }}>
            {story.author?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:600 }}>{story.author?.username}</div>
            {story.author?.bio && <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{story.author.bio}</div>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
