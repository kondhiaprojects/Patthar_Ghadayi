import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

// ── Small stat card ──
function StatCard({ label, value, color }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-num" style={{ color }}>{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

// ── Confirm modal ──
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <p style={{ fontSize: 15, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab]       = useState('dashboard');
  const [stats, setStats]   = useState(null);
  const [stories, setStories] = useState([]);
  const [users, setUsers]   = useState([]);
  const [storiesPage, setStoriesPage] = useState(1);
  const [usersPage, setUsersPage]     = useState(1);
  const [storiesPagination, setStoriesPagination] = useState({});
  const [usersPagination, setUsersPagination]     = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  // Guard: must be admin
  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (user.role !== 'admin') { navigate('/'); }
  }, [user, navigate]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/stats');
      setStats(data);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to load stats.'); }
  }, []);

  // ── Fetch stories ──
  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: storiesPage });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await axios.get(`/api/admin/stories?${params}`);
      setStories(data.stories || []);
      setStoriesPagination(data.pagination || {});
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to load stories.'); }
    finally { setLoading(false); }
  }, [storiesPage, statusFilter]);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/users?page=${usersPage}`);
      setUsers(data.users || []);
      setUsersPagination(data.pagination || {});
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to load users.'); }
    finally { setLoading(false); }
  }, [usersPage]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'stories') fetchStories(); }, [tab, fetchStories]);
  useEffect(() => { if (tab === 'users')   fetchUsers();   }, [tab, fetchUsers]);

  const showConfirm = (message, onConfirm) => setConfirm({ message, onConfirm });

  // ── Story actions ──
  const deleteStory = (id) => {
    showConfirm('Delete this story permanently?', async () => {
      setConfirm(null);
      try {
        await axios.delete(`/api/admin/stories/${id}`);
        setStories(prev => prev.filter(s => s._id !== id));
        fetchStats();
        setMsg('Story deleted.');
      } catch (err) { setMsg(err.response?.data?.error || 'Failed.'); }
    });
  };

  const toggleStoryStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await axios.patch(`/api/admin/stories/${id}/status`, { status: newStatus });
      setStories(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
      fetchStats();
      setMsg(`Story ${newStatus}.`);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed.'); }
  };

  // ── User actions ──
  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'writer' : 'admin';
    try {
      await axios.patch(`/api/admin/users/${id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: newRole } : u));
      setMsg(`Role changed to ${newRole}.`);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed.'); }
  };

  const deleteUser = (id, username) => {
    showConfirm(`Delete user "${username}" and all their stories?`, async () => {
      setConfirm(null);
      try {
        await axios.delete(`/api/admin/users/${id}`);
        setUsers(prev => prev.filter(u => u._id !== id));
        fetchStats();
        setMsg('User deleted.');
      } catch (err) { setMsg(err.response?.data?.error || 'Failed.'); }
    });
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div>
      <Navbar />

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="admin-wrap">
        {/* ── Sidebar ── */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-title">Admin Panel</div>
          {['dashboard', 'stories', 'users'].map(t => (
            <button
              key={t}
              className={`admin-sidebar-btn ${tab === t ? 'active' : ''}`}
              onClick={() => { setTab(t); setMsg(''); }}
            >
              {t === 'dashboard' ? '📊 Dashboard' : t === 'stories' ? '📖 Stories' : '👥 Users'}
            </button>
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="admin-main">
          {msg && (
            <div className="success-msg" style={{ marginBottom: 16 }} onClick={() => setMsg('')}>
              {msg} <span style={{ float:'right', cursor:'pointer' }}>×</span>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <div>
              <h2 className="admin-section-title">Dashboard</h2>
              {stats ? (
                <>
                  <div className="admin-stats-row">
                    <StatCard label="Total Stories"     value={stats.totalStories}     color="#2d5a3d" />
                    <StatCard label="Published"         value={stats.publishedStories} color="#16a34a" />
                    <StatCard label="Drafts"            value={stats.draftStories}     color="#d97706" />
                    <StatCard label="Registered Users"  value={stats.totalUsers}       color="#2563eb" />
                  </div>

                  <h3 style={{ marginTop: 32, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Top Stories by Views</h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Views</th>
                          <th>Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topStories?.map(s => (
                          <tr key={s._id}>
                            <td>
                              <a href={`/stories/${s._id}`} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#2d5a3d', textDecoration: 'underline' }}>
                                {s.title}
                              </a>
                            </td>
                            <td><span style={{cursor:"pointer",color:"var(--green)",textDecoration:"underline"}} onClick={() => window.open(`/user/${s.author?._id}`,"_blank")}>{s.author?.username}</span></td>
                            <td>{s.viewCount}</td>
                            <td>{s.publishedAt ? new Date(s.publishedAt).toLocaleDateString('en-IN') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="loading">Loading stats…</div>
              )}
            </div>
          )}

          {/* ── STORIES ── */}
          {tab === 'stories' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 className="admin-section-title" style={{ margin: 0 }}>All Stories</h2>
                <select
                  className="admin-filter-select"
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setStoriesPage(1); }}
                >
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {loading ? <div className="loading">Loading…</div> : (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Status</th>
                          <th>Views</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stories.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign:'center', color:'#6b7280', padding: 24 }}>No stories found.</td></tr>
                        ) : stories.map(s => (
                          <tr key={s._id}>
                            <td>
                              <a href={s.status === 'published' ? `/stories/${s._id}` : '#'}
                                target={s.status === 'published' ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                style={{ color: '#2d5a3d', textDecoration: s.status === 'published' ? 'underline' : 'none', cursor: s.status === 'published' ? 'pointer' : 'default' }}>
                                {s.title}
                              </a>
                            </td>
                            <td style={{ fontSize: 13 }}>{s.author?.username}<br /><span style={{ color:'#9ca3af', fontSize:11 }}>{s.author?.email}</span></td>
                            <td>
                              <span className={`admin-status-badge ${s.status}`}>
                                {s.status === 'published' ? '● Published' : '○ Draft'}
                              </span>
                            </td>
                            <td>{s.viewCount || 0}</td>
                            <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {new Date(s.createdAt || s.publishedAt).toLocaleDateString('en-IN')}
                            </td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  className="admin-btn-toggle"
                                  onClick={() => toggleStoryStatus(s._id, s.status)}
                                >{s.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                                <button
                                  className="admin-btn-delete"
                                  onClick={() => deleteStory(s._id)}
                                >Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {storiesPagination.pages > 1 && (
                    <div className="pagination" style={{ marginTop: 16 }}>
                      <button onClick={() => setStoriesPage(p => p - 1)} disabled={storiesPage <= 1}>← Prev</button>
                      <span>Page {storiesPage} of {storiesPagination.pages}</span>
                      <button onClick={() => setStoriesPage(p => p + 1)} disabled={storiesPage >= storiesPagination.pages}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              <h2 className="admin-section-title">All Users</h2>
              {loading ? <div className="loading">Loading…</div> : (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Stories</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign:'center', color:'#6b7280', padding: 24 }}>No users found.</td></tr>
                        ) : users.map(u => (
                          <tr key={u._id}>
                            <td style={{ fontWeight: 500 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div className="navbar-user-avatar" style={{ width:28, height:28, fontSize:11, flexShrink:0 }}>
                                  {u.username?.[0]?.toUpperCase()}
                                </div>
                                {u.username}
                              </div>
                            </td>
                            <td style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                            <td>
                              <span className={`admin-role-badge ${u.role}`}>
                                {u.role === 'admin' ? '🔑 Admin' : '✍️ Writer'}
                              </span>
                            </td>
                            <td>{u.storyCount}</td>
                            <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {new Date(u.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  className="admin-btn-toggle"
                                  onClick={() => toggleRole(u._id, u.role)}
                                  disabled={u._id === user.id}
                                  title={u._id === user.id ? "Can't change your own role" : ''}
                                >{u.role === 'admin' ? 'Make Writer' : 'Make Admin'}</button>
                                <button
                                  className="admin-btn-delete"
                                  onClick={() => deleteUser(u._id, u.username)}
                                  disabled={u._id === user.id}
                                  title={u._id === user.id ? "Can't delete yourself" : ''}
                                >Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {usersPagination.pages > 1 && (
                    <div className="pagination" style={{ marginTop: 16 }}>
                      <button onClick={() => setUsersPage(p => p - 1)} disabled={usersPage <= 1}>← Prev</button>
                      <span>Page {usersPage} of {usersPagination.pages}</span>
                      <button onClick={() => setUsersPage(p => p + 1)} disabled={usersPage >= usersPagination.pages}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
