import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Make plain URLs in text clickable
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2d5a3d;text-decoration:underline;">${url}</a>`);
}

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`/api/stories/${id}`);
        setStory(data.story);
      } catch (err) {
        setError(err.response?.data?.error || 'Story not found.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <><Navbar /><div className="loading">Loading story…</div><Footer /></>;
  if (error)   return <><Navbar /><div className="page-wrap"><p style={{color:'#dc2626', marginTop:40}}>{error}</p><button onClick={() => navigate('/stories')} style={{marginTop:16, textDecoration:'underline', background:'none', border:'none', cursor:'pointer'}}>← Back to Stories</button></div><Footer /></>;

  const readTime = Math.max(1, Math.round(story.body.replace(/<[^>]*>/g,'').split(/\s+/).length / 200));
  const processedBody = linkify(story.body);

  // Build a Cloudinary PDF viewer URL from the secure_url
  const getPdfViewerUrl = (url) => {
    // For Cloudinary raw PDFs, append .pdf extension if missing, use fl_attachment:false trick
    // Simply open in Google Docs viewer for reliable in-browser viewing
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  return (
    <div>
      <Navbar />
      <div className="story-page">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', fontSize:13, marginBottom:20 }}
        >
          ← Back
        </button>

        {/* Thumbnail */}
        {story.thumbnailImage?.url && (
          <div className="story-thumbnail-wrap">
            <img src={story.thumbnailImage.url} alt={story.title} className="story-thumbnail" />
          </div>
        )}

        {/* Header */}
        <div className="story-page-title">{story.title}</div>
        <div className="story-page-meta">
          <span>By <strong>{story.author?.username}</strong></span>
          <span>{story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''}</span>
          <span>{readTime} min read</span>
          <span>👁 {story.viewCount} views</span>
        </div>
        <hr className="story-page-divider" />

        {/* Body — linkified so URLs are clickable */}
        <div
          className="story-page-body"
          dangerouslySetInnerHTML={{ __html: processedBody }}
        />

        {/* Tags */}
        {story.tags?.length > 0 && (
          <div className="story-tags">
            {story.tags.map(t => <span key={t} className="story-tag">#{t}</span>)}
          </div>
        )}

        {/* Story Photos */}
        {story.images?.length > 0 && (
          <div className="story-media-section">
            <h3>Photos</h3>
            <div className="story-images-grid">
              {story.images.map((img, i) => (
                <img key={i} src={img.url} alt={img.altText || story.title} />
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

        {/* PDFs — viewable inline + download as .pdf */}
        {story.pdfs?.length > 0 && (
          <div className="story-media-section">
            <h3>Attachments</h3>
            {story.pdfs.map((pdf, i) => (
              <div key={i} className="pdf-item-wrap">
                <div className="pdf-item">
                  <span className="pdf-item-icon">📄</span>
                  <span className="pdf-item-name">{pdf.displayName}</span>
                  <div className="pdf-item-links">
                    <a
                      href={getPdfViewerUrl(pdf.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >View</a>
                    <a
                      href={pdf.url}
                      download={pdf.displayName.endsWith('.pdf') ? pdf.displayName : `${pdf.displayName}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >Download .pdf</a>
                  </div>
                </div>
                {/* Inline PDF preview using Google Docs viewer */}
                <iframe
                  src={getPdfViewerUrl(pdf.url)}
                  className="pdf-inline-viewer"
                  title={pdf.displayName}
                  allow="fullscreen"
                />
              </div>
            ))}
          </div>
        )}

        {/* External Refs — fully clickable */}
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
                >
                  → {ref.label}
                </a>
                <div className="ext-ref-url">{ref.url}</div>
              </div>
            ))}
          </div>
        )}

        {/* Author card */}
        <div style={{ marginTop:48, padding:'20px', border:'1px solid #e5e7eb', borderRadius:8, display:'flex', gap:14 }}>
          <div className="navbar-user-avatar" style={{width:44,height:44,fontSize:16}}>
            {story.author?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{fontWeight:600}}>{story.author?.username}</div>
            {story.author?.bio && <div style={{fontSize:13, color:'#6b7280', marginTop:4}}>{story.author.bio}</div>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
