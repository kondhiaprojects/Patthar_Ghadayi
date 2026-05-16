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
      <Link to="/" className="navbar-logo">
        <img src="/logo.png" alt="Patthar Ghadayi Majdoor Sangh Logo" className="navbar-logo-img" />
        <span>Patthar Ghadayi Majdoor Sangh</span>
      </Link>

      {/* Center: Nav links — always show all 3 */}
      <div className="navbar-links" style={{ flex: 1, justifyContent: 'center' }}>
        <Link to="/about">About</Link>
        <Link to="/stories">Stories</Link>
        <Link to={user ? '/post' : '/auth'}>Post a Story</Link>
      </div>

      {/* Right: Auth */}
      <div className="navbar-right">
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
