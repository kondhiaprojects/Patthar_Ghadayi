import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

// ── Reusable drag-and-drop zone ──
function DropZone({ accept, multiple, uploading, label, hint, icon, onFiles }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      className={`drop-zone ${dragging ? 'drop-zone-active' : ''}`}
      onClick={() => inputRef.current.click()}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple}
        onChange={e => { const f = Array.from(e.target.files); if (f.length) onFiles(f); e.target.value = ''; }}
        style={{ display: 'none' }} />
      <div className="drop-zone-icon">{icon}</div>
      <p className="drop-zone-label">{uploading ? 'Uploading…' : label}</p>
      <p className="drop-zone-hint">{hint}</p>
    </div>
  );
}

export default function EditStory() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]           = useState(true);
  const [title, setTitle]               = useState('');
  const [body, setBody]                 = useState('');
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [images, setImages]             = useState([]);
  const [videos, setVideos]             = useState([]);
  const [pdfs, setPdfs]                 = useState([]);
  const [extRefs, setExtRefs]           = useState([{ label: '', url: '' }]);
  const [originalStatus, setOriginalStatus] = useState('draft');
  const [uploading, setUploading]       = useState({ thumbnail: false, image: false, video: false, pdf: false });
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // ── Load existing story ──
  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    const fetch = async () => {
      try {
        const { data } = await axios.get(`/api/stories/${id}/edit`);
        const s = data.story;
        setTitle(s.title || '');
        setBody(s.body || '');
        setThumbnailImage(s.thumbnailImage?.url ? s.thumbnailImage : null);
        setImages(s.images || []);
        setVideos(s.videos || []);
        setPdfs(s.pdfs || []);
        setExtRefs(s.externalRefs?.length ? s.externalRefs : [{ label: '', url: '' }]);
        setOriginalStatus(s.status);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load story.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, user, navigate]);

  // ── Upload helpers ──
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

  const handleThumbnailFiles = async (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) { setError('Thumbnail must be an image.'); return; }
    setError('');
    try { setThumbnailImage(await uploadToApi(file, 'image', 'thumbnail')); }
    catch (err) { setError(err.message); }
  };

  const handleImageFiles = async (files) => {
    const imgFiles = files.filter(f => f.type.startsWith('image/'));
    if (images.length + imgFiles.length > 20) { setError('Max 20 images.'); return; }
    setError('');
    for (const file of imgFiles) {
      try { const data = await uploadToApi(file, 'image', 'image'); setImages(prev => [...prev, data]); }
      catch (err) { setError(err.message); }
    }
  };

  const handleVideoFiles = async (files) => {
    if (videos.length >= 3) { setError('Max 3 videos.'); return; }
    setError('');
    try { const data = await uploadToApi(files[0], 'video', 'video'); setVideos(prev => [...prev, data]); }
    catch (err) { setError(err.message); }
  };

  const handlePdfFiles = async (files) => {
    if (pdfs.length >= 5) { setError('Max 5 PDFs.'); return; }
    if (files[0].type !== 'application/pdf') { setError('Only PDF files allowed.'); return; }
    setError('');
    try { const data = await uploadToApi(files[0], 'pdf', 'pdf'); setPdfs(prev => [...prev, data]); }
    catch (err) { setError(err.message); }
  };

  const updateRef  = (i, field, val) => setExtRefs(refs => refs.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRef     = () => setExtRefs(r => [...r, { label: '', url: '' }]);
  const removeRef  = (i) => setExtRefs(r => r.filter((_, idx) => idx !== i));

  const buildPayload = () => ({
    title: title.trim(), body, tags: [],
    thumbnailImage: thumbnailImage || { fileKey: '', displayName: '', url: '', altText: '' },
    images, videos, pdfs,
    externalRefs: extRefs.filter(r => r.label && r.url),
  });

  const handleSave = async () => {
    if (!title || !body) { setError('Title and story body are required.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await axios.patch(`/api/stories/${id}`, buildPayload());
      setSuccess('Story saved!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleSaveAndPublish = async () => {
    if (!title || !body) { setError('Title and story body are required.'); return; }
    setPublishing(true); setError(''); setSuccess('');
    try {
      await axios.patch(`/api/stories/${id}`, buildPayload());
      if (originalStatus !== 'published') {
        await axios.post(`/api/stories/${id}/publish`);
      }
      setSuccess('Story published! Redirecting…');
      setTimeout(() => navigate(`/stories/${id}`), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish.');
    } finally { setPublishing(false); }
  };

  if (loading) return <><Navbar /><div className="loading">Loading story…</div><Footer /></>;

  return (
    <div>
      <Navbar />
      <div className="post-page">
        <h1>Edit Story</h1>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* ── 1. Cover Photo ── */}
        <div className="post-field">
          <label>Cover Photo (Thumbnail)</label>
          <p className="post-field-sub">This appears as the story card image when browsing.</p>
          {thumbnailImage ? (
            <div className="thumbnail-preview">
              <img src={thumbnailImage.url} alt="Cover" />
              <button className="thumb-remove-btn" onClick={() => setThumbnailImage(null)}>× Remove</button>
            </div>
          ) : (
            <DropZone
              accept="image/*" multiple={false} uploading={uploading.thumbnail}
              label="Click or drag & drop cover photo" hint="JPEG, PNG, WebP · Max 10 MB"
              icon="🖼" onFiles={handleThumbnailFiles}
            />
          )}
        </div>

        {/* ── 2. Title ── */}
        <div className="post-field">
          <label>Title *</label>
          <input type="text" placeholder="Story title…" value={title}
            onChange={e => setTitle(e.target.value)} maxLength={150} />
          <div className="hint">{title.length}/150</div>
        </div>

        {/* ── 3. Body ── */}
        <div className="post-field">
          <label>Your Story *</label>
          <textarea rows={14} placeholder="Write your experience here…"
            value={body} onChange={e => setBody(e.target.value)} style={{ lineHeight: 1.7 }} />
          <div className="hint">You can use basic HTML tags: &lt;b&gt;, &lt;i&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href="..."&gt;</div>
        </div>

        {/* ── 4. Story Photos ── */}
        <div className="post-field">
          <label>Story Photos</label>
          <p className="post-field-sub">Photos shown inside the story.</p>
          <DropZone accept="image/*" multiple uploading={uploading.image}
            label="Click or drag & drop photos" hint="JPEG, PNG, WebP · Max 10 MB each · Max 20"
            icon="📷" onFiles={handleImageFiles} />
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
          <DropZone accept="video/mp4,video/webm,video/quicktime" multiple={false} uploading={uploading.video}
            label="Click or drag & drop a video" hint="MP4, WebM, MOV · Max 500 MB · Max 3"
            icon="🎥" onFiles={handleVideoFiles} />
          {videos.length > 0 && (
            <div className="upload-file-list">
              {videos.map((v, i) => (
                <div key={i} className="upload-file-row">
                  <span>🎬</span><span className="file-name">{v.displayName}</span>
                  <button className="remove-btn" onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 6. PDFs ── */}
        <div className="post-field">
          <label>Attachments (PDF)</label>
          <DropZone accept="application/pdf" multiple={false} uploading={uploading.pdf}
            label="Click or drag & drop a PDF" hint="Max 25 MB · Max 5 files"
            icon="📎" onFiles={handlePdfFiles} />
          {pdfs.length > 0 && (
            <div className="upload-file-list">
              {pdfs.map((pdf, i) => (
                <div key={i} className="upload-file-row">
                  <span>📄</span><span className="file-name">{pdf.displayName}</span>
                  <button className="remove-btn" onClick={() => setPdfs(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 7. External Refs ── */}
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
          {extRefs.length < 20 && <button className="ext-ref-add" onClick={addRef}>+ Add reference</button>}
        </div>

        {/* ── Actions ── */}
        <div className="post-actions">
          <button className="btn-outline" onClick={() => navigate('/my-stories')} disabled={saving || publishing}>
            ← Back
          </button>
          <button className="btn-outline" onClick={handleSave} disabled={saving || publishing}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn-green" onClick={handleSaveAndPublish} disabled={saving || publishing}>
            {publishing ? 'Publishing…' : originalStatus === 'published' ? 'Save & Update' : 'Save & Publish'}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
