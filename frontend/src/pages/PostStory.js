import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

// ── Drag-and-drop upload zone component ──
function DropZone({ accept, multiple, uploading, label, hint, icon, onFiles }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      className={`drop-zone ${dragging ? 'drop-zone-active' : ''}`}
      onClick={() => inputRef.current.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: 'none' }} />
      <div className="drop-zone-icon">{icon}</div>
      <p className="drop-zone-label">{uploading ? 'Uploading…' : label}</p>
      <p className="drop-zone-hint">{hint}</p>
    </div>
  );
}

export default function PostStory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle]               = useState('');
  const [body, setBody]                 = useState('');
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [images, setImages]             = useState([]);
  const [videos, setVideos]             = useState([]);
  const [pdfs, setPdfs]                 = useState([]);
  const [extRefs, setExtRefs]           = useState([{ label: '', url: '' }]);
  const [uploading, setUploading]       = useState({ thumbnail: false, image: false, video: false, pdf: false });
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="page-wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 16, color: '#6b7280' }}>You need to be logged in to post a story.</p>
          <button onClick={() => navigate('/auth')} className="btn-green" style={{ marginTop: 20 }}>Sign In</button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Generic uploader ──
  const uploadToApi = async (file, endpoint, type) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(u => ({ ...u, [type]: true }));
    try {
      const { data } = await axios.post(`/api/upload/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.error || `Failed to upload ${type}`);
    } finally {
      setUploading(u => ({ ...u, [type]: false }));
    }
  };

  // ── Thumbnail ──
  const handleThumbnailFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Thumbnail must be an image.'); return; }
    setError('');
    try {
      const data = await uploadToApi(file, 'image', 'thumbnail');
      setThumbnailImage(data);
    } catch (err) { setError(err.message); }
  };

  // ── Story Photos ──
  const handleImageFiles = async (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (images.length + imageFiles.length > 20) { setError('Max 20 images per story.'); return; }
    setError('');
    for (const file of imageFiles) {
      try {
        const data = await uploadToApi(file, 'image', 'image');
        setImages(prev => [...prev, data]);
      } catch (err) { setError(err.message); }
    }
  };

  // ── Videos ──
  const handleVideoFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (videos.length >= 3) { setError('Max 3 videos per story.'); return; }
    setError('');
    try {
      const data = await uploadToApi(file, 'video', 'video');
      setVideos(prev => [...prev, data]);
    } catch (err) { setError(err.message); }
  };

  // ── PDFs ──
  const handlePdfFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (pdfs.length >= 5) { setError('Max 5 PDFs per story.'); return; }
    if (file.type !== 'application/pdf') { setError('Only PDF files allowed.'); return; }
    setError('');
    try {
      const data = await uploadToApi(file, 'pdf', 'pdf');
      setPdfs(prev => [...prev, data]);
    } catch (err) { setError(err.message); }
  };

  // ── External refs ──
  const updateRef = (i, field, val) =>
    setExtRefs(refs => refs.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRef    = () => setExtRefs(r => [...r, { label: '', url: '' }]);
  const removeRef = (i) => setExtRefs(r => r.filter((_, idx) => idx !== i));

  const buildPayload = () => ({
    title: title.trim(),
    body,
    tags: [],
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

        {/* ── 1. Thumbnail / Cover Photo ── */}
        <div className="post-field">
          <label>Cover Photo (Thumbnail)</label>
          <p className="post-field-sub">This appears as the story card image when browsing.</p>
          {thumbnailImage ? (
            <div className="thumbnail-preview">
              <img src={thumbnailImage.url} alt="Cover" />
              <button
                className="thumb-remove-btn"
                onClick={() => setThumbnailImage(null)}
              >× Remove</button>
            </div>
          ) : (
            <DropZone
              accept="image/*"
              multiple={false}
              uploading={uploading.thumbnail}
              label="Click or drag & drop cover photo here"
              hint="JPEG, PNG, WebP · Max 10 MB · 1 image"
              icon="🖼"
              onFiles={handleThumbnailFiles}
            />
          )}
        </div>

        {/* ── 2. Title ── */}
        <div className="post-field">
          <label>Title *</label>
          <input
            type="text"
            placeholder="Give your story a title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={150}
          />
          <div className="hint">{title.length}/150</div>
        </div>

        {/* ── 3. Story Body ── */}
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

        {/* ── 4. Story Photos ── */}
        <div className="post-field">
          <label>Story Photos</label>
          <p className="post-field-sub">Photos shown inside the story (not the thumbnail).</p>
          <DropZone
            accept="image/*"
            multiple={true}
            uploading={uploading.image}
            label="Click or drag & drop photos here"
            hint="JPEG, PNG, WebP, GIF · Max 10 MB each · Max 20"
            icon="📷"
            onFiles={handleImageFiles}
          />
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

        {/* ── 5. Videos ── */}
        <div className="post-field">
          <label>Videos</label>
          <DropZone
            accept="video/mp4,video/webm,video/quicktime"
            multiple={false}
            uploading={uploading.video}
            label="Click or drag & drop a video here"
            hint="MP4, WebM, MOV · Max 500 MB · Max 3 videos"
            icon="🎥"
            onFiles={handleVideoFiles}
          />
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

        {/* ── 6. PDFs ── */}
        <div className="post-field">
          <label>Attachments (PDF)</label>
          <DropZone
            accept="application/pdf"
            multiple={false}
            uploading={uploading.pdf}
            label="Click or drag & drop a PDF here"
            hint="Max 25 MB per file · Max 5 files"
            icon="📎"
            onFiles={handlePdfFiles}
          />
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

        {/* ── 7. External References ── */}
        <div className="post-field">
          <label>External References</label>
          {extRefs.map((ref, i) => (
            <div key={i} className="ext-ref-row">
              <input type="text" placeholder="Label (e.g. Official Website)" value={ref.label}
                onChange={e => updateRef(i, 'label', e.target.value)} />
              <input type="url" placeholder="https://example.com" value={ref.url}
                onChange={e => updateRef(i, 'url', e.target.value)} />
              {extRefs.length > 1 && (
                <button className="remove-btn" style={{ fontSize:18, color:'#9ca3af', background:'none', border:'none', cursor:'pointer' }}
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
