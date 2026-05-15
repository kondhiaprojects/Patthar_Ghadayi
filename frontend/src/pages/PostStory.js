import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function PostStory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle]               = useState('');
  const [body, setBody]                 = useState('');
  const [tags, setTags]                 = useState('');
  const [thumbnailImage, setThumbnailImage] = useState(null); // {fileKey, displayName, url, altText}
  const [images, setImages]             = useState([]);
  const [videos, setVideos]             = useState([]);
  const [pdfs, setPdfs]                 = useState([]);
  const [extRefs, setExtRefs]           = useState([{ label: '', url: '' }]);
  const [uploading, setUploading]       = useState({ thumbnail: false, image: false, video: false, pdf: false });
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const thumbnailInputRef = useRef();
  const imageInputRef     = useRef();
  const videoInputRef     = useRef();
  const pdfInputRef       = useRef();

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="page-wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 16, color: '#6b7280' }}>You need to be logged in to post a story.</p>
          <button onClick={() => navigate('/auth')} className="btn-green" style={{ marginTop: 20 }}>
            Sign In
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Upload handlers ──
  const uploadFile = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(u => ({ ...u, [type]: true }));
    try {
      const { data } = await axios.post(`/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.error || `Failed to upload ${type}`);
    } finally {
      setUploading(u => ({ ...u, [type]: false }));
    }
  };

  const uploadNonImage = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(u => ({ ...u, [type]: true }));
    try {
      const { data } = await axios.post(`/api/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.error || `Failed to upload ${type}`);
    } finally {
      setUploading(u => ({ ...u, [type]: false }));
    }
  };

  const handleThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    try {
      const data = await uploadFile(file, 'thumbnail');
      setThumbnailImage(data);
    } catch (err) { setError(err.message); }
    e.target.value = '';
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 20) { setError('Max 20 images per story.'); return; }
    setError('');
    for (const file of files) {
      try {
        const data = await uploadFile(file, 'image');
        setImages(prev => [...prev, data]);
      } catch (err) { setError(err.message); }
    }
    e.target.value = '';
  };

  const handleVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (videos.length >= 3) { setError('Max 3 videos per story.'); return; }
    setError('');
    try {
      const data = await uploadNonImage(file, 'video');
      setVideos(prev => [...prev, data]);
    } catch (err) { setError(err.message); }
    e.target.value = '';
  };

  const handlePdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (pdfs.length >= 5) { setError('Max 5 PDFs per story.'); return; }
    setError('');
    try {
      const data = await uploadNonImage(file, 'pdf');
      setPdfs(prev => [...prev, data]);
    } catch (err) { setError(err.message); }
    e.target.value = '';
  };

  // ── External refs ──
  const updateRef = (i, field, val) => {
    setExtRefs(refs => refs.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addRef    = () => setExtRefs(r => [...r, { label: '', url: '' }]);
  const removeRef = (i) => setExtRefs(r => r.filter((_, idx) => idx !== i));

  // ── Build payload ──
  const buildPayload = () => ({
    title: title.trim(),
    body,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10),
    thumbnailImage: thumbnailImage || { fileKey: '', displayName: '', url: '', altText: '' },
    images,
    videos,
    pdfs,
    externalRefs: extRefs.filter(r => r.label && r.url),
  });

  const handleSaveDraft = async () => {
    if (!title || !body) { setError('Title and story body are required.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await axios.post('/api/stories', buildPayload());
      setSuccess('Draft saved! View it in My Stories.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save draft.');
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!title || !body) { setError('Title and story body are required.'); return; }
    setPublishing(true); setError(''); setSuccess('');
    try {
      const { data: draft } = await axios.post('/api/stories', buildPayload());
      await axios.post(`/api/stories/${draft.story._id}/publish`);
      setSuccess('Story published! Redirecting…');
      setTimeout(() => navigate(`/stories/${draft.story._id}`), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish story.');
    } finally { setPublishing(false); }
  };

  return (
    <div>
      <Navbar />
      <div className="post-page">
        <h1>Post a Story</h1>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* ── Thumbnail / Profile Picture ── */}
        <div className="post-field">
          <label>Story Thumbnail / Cover Photo *</label>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            This image will appear as the card thumbnail when browsing stories.
          </p>
          <div className="thumbnail-upload-area">
            {thumbnailImage ? (
              <div className="thumbnail-preview">
                <img src={thumbnailImage.url} alt="Thumbnail preview" />
                <button
                  className="remove-btn"
                  onClick={() => setThumbnailImage(null)}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, fontSize: 16,
                    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                    borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ) : (
              <div className="upload-zone" onClick={() => thumbnailInputRef.current.click()}>
                <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnail} />
                <div style={{ fontSize: 32 }}>🖼</div>
                <p>{uploading.thumbnail ? 'Uploading…' : 'Click to upload cover photo'}</p>
                <p>JPEG, PNG, WebP · Max 10 MB · 1 image</p>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="post-field">
          <label>Title *</label>
          <input type="text" placeholder="Give your story a title…" value={title}
            onChange={e => setTitle(e.target.value)} maxLength={150} />
          <div className="hint">{title.length}/150</div>
        </div>

        {/* Body */}
        <div className="post-field">
          <label>Your Story *</label>
          <textarea
            rows={14}
            placeholder="Write your experience here…"
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ lineHeight: 1.7 }}
          />
          <div className="hint">You can use basic HTML tags: &lt;b&gt;, &lt;i&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href="..."&gt;</div>
        </div>

        {/* Tags */}
        <div className="post-field">
          <label>Tags</label>
          <input type="text" placeholder="travel, food, adventure  (comma-separated, max 10)" value={tags}
            onChange={e => setTags(e.target.value)} />
        </div>

        {/* ── Story Photos ── */}
        <div className="post-field">
          <label>Story Photos</label>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            Photos related to the story content (shown in the story detail page).
          </p>
          <div className="upload-zone" onClick={() => imageInputRef.current.click()}>
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImages} />
            <div style={{ fontSize: 28 }}>📷</div>
            <p>{uploading.image ? 'Uploading…' : 'Click to upload story photos'}</p>
            <p>JPEG, PNG, WebP, GIF · Max 10 MB each · Max 20</p>
          </div>
          {images.length > 0 && (
            <div className="upload-preview">
              {images.map((img, i) => (
                <div key={i} className="upload-thumb">
                  <img src={img.url} alt={img.displayName} />
                  <button className="remove-btn" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Videos ── */}
        <div className="post-field">
          <label>Videos</label>
          <div className="upload-zone" onClick={() => videoInputRef.current.click()}>
            <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideo} />
            <div style={{ fontSize: 28 }}>🎥</div>
            <p>{uploading.video ? 'Uploading…' : 'Click to upload a video'}</p>
            <p>MP4, WebM, MOV · Max 500 MB · Max 3 videos</p>
          </div>
          {videos.length > 0 && (
            <div className="upload-file-list">
              {videos.map((v, i) => (
                <div key={i} className="upload-file-row">
                  <span>🎬</span>
                  <span className="file-name">{v.displayName}</span>
                  <button className="remove-btn" onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PDFs ── */}
        <div className="post-field">
          <label>Attachments (PDF only)</label>
          <div className="upload-zone" onClick={() => pdfInputRef.current.click()}>
            <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdf} />
            <div style={{ fontSize: 28 }}>📎</div>
            <p>{uploading.pdf ? 'Uploading…' : 'Click to upload a PDF'}</p>
            <p>Max 25 MB per file · Max 5 files</p>
          </div>
          {pdfs.length > 0 && (
            <div className="upload-file-list">
              {pdfs.map((pdf, i) => (
                <div key={i} className="upload-file-row">
                  <span>📄</span>
                  <span className="file-name">{pdf.displayName}</span>
                  <button className="remove-btn" onClick={() => setPdfs(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── External References ── */}
        <div className="post-field">
          <label>External References</label>
          {extRefs.map((ref, i) => (
            <div key={i} className="ext-ref-row">
              <input type="text" placeholder="Label (e.g. Official Website)" value={ref.label}
                onChange={e => updateRef(i, 'label', e.target.value)} />
              <input type="url" placeholder="https://example.com" value={ref.url}
                onChange={e => updateRef(i, 'url', e.target.value)} />
              {extRefs.length > 1 && (
                <button className="remove-btn" style={{fontSize:18, color:'#9ca3af', background:'none', border:'none', cursor:'pointer'}}
                  onClick={() => removeRef(i)}>×</button>
              )}
            </div>
          ))}
          {extRefs.length < 20 && (
            <button className="ext-ref-add" onClick={addRef}>+ Add reference</button>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="post-actions">
          <button className="btn-outline" onClick={handleSaveDraft} disabled={saving || publishing}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn-green" onClick={handlePublish} disabled={saving || publishing}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
