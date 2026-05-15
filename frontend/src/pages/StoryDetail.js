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

// ── PDF Helpers ────────────────────────────────────────────────────────────
//
// ROOT CAUSE: Cloudinary uploads PDFs as resource_type:'raw', which makes
// Cloudinary add a Content-Disposition:attachment header on every response.
// The browser obeys that header and downloads instead of rendering — even
// when target="_blank" is set on the <a> tag.
//
// FIX for View  → route the URL through Google Docs Viewer, which fetches
//                 the file server-side and renders it regardless of headers.
// FIX for Download → fetch the bytes, re-type the blob as application/pdf,
//                    and trigger a named download via a temporary <a> tag.

// Open PDF in Google Docs Viewer (opens in a new tab, no CORS issues)
function viewPdf(url) {
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`;
  window.open(viewerUrl, '_blank', 'noopener,noreferrer');
}

// Force-download the PDF with the correct filename
async function downloadPdf(url, filename) {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    // Re-type the blob so the browser saves it as a proper PDF regardless
    // of whatever Content-Type Cloudinary sent in the response.
    const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Delay revoke so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch {
    // Fallback: let the browser handle it directly (will likely still download)
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
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
      <div className="story-page">

        <button
          onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', fontSize:13, marginBottom:20 }}
        >← Back</button>

        {/* Cover / Thumbnail */}
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

        {/* Body */}
        <div className="story-page-body" dangerouslySetInnerHTML={{ __html: processedBody }} />

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

        {/* PDFs — View opens Google Docs Viewer in new tab; Download forces .pdf save */}
        {story.pdfs?.length > 0 && (
          <div className="story-media-section">
            <h3>Attachments</h3>
            {story.pdfs.map((pdf, i) => (
              <div key={i} className="pdf-item">
                <span className="pdf-item-icon">📄</span>
                <span className="pdf-item-name">{pdf.displayName}</span>
                <div className="pdf-item-links">
                  {/* viewPdf() routes through Google Docs Viewer so the
                      Cloudinary Content-Disposition:attachment header is
                      bypassed and the PDF renders in-browser */}
                  <button
                    className="pdf-view-btn"
                    onClick={() => viewPdf(pdf.url)}
                  >View PDF</button>
                  <button
                    className="pdf-download-btn"
                    onClick={() => downloadPdf(pdf.url, pdf.displayName)}
                  >Download .pdf</button>
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
