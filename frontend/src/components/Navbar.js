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
    {/* Left: Logo — fixed width */}
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

    {/* Right: Auth — same flex:1 as left, aligned to end */}
    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
      {user ? (
        <div className="navbar-user" onClick={() => setOpen(p => !p)}>
          <div className="navbar-user-avatar">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <span className="navbar-username">{user.username}</span>
          {open && (
            <div className="user-dropdown">
              <Link to="/my-stories" onClick={() => setOpen(false)}>My Stories</Link>
              <button onClick={handleLogout}>Sign Out</button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/auth" className="navbar-signin-btn">Sign In</Link>
      )}
    </div>
  </nav>
);
}
