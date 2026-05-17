import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar">
      {/* Left: Logo */}
      <div style={{ flex: 1 }}>
        <Link to="/" className="navbar-logo">
          <img src="/logo.png" alt="Patthar Ghadayi Majdoor Sangh Logo" className="navbar-logo-img" />
          <span style={{ whiteSpace: 'nowrap' }}>Patthar Ghadayi Majdoor Sangh</span>
        </Link>
      </div>

      {/* Center: Nav links */}
      <div className="navbar-links">
        <Link to="/about">About</Link>
        <Link to="/stories">Stories</Link>
        <Link to={user ? '/post' : '/auth'}>Post a Story</Link>
      </div>

      {/* Right: show account if logged in, nothing if not */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {user && (
          <div className="navbar-user" onClick={() => setOpen(p => !p)}>
            <div
              className="navbar-user-avatar"
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); navigate(`/user/${user.id || user._id}`); }}
              title="View your profile"
            >
              {user.username?.[0]?.toUpperCase()}
            </div>
            <span className="navbar-username">{user.username}</span>
            {open && (
              <div className="user-dropdown">
                <Link to={`/user/${user.id || user._id}`} onClick={() => setOpen(false)}>My Profile</Link>
                <Link to="/my-stories" onClick={() => setOpen(false)}>My Stories</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setOpen(false)}>🔑 Admin Panel</Link>
                )}
                <button onClick={handleLogout}>Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
