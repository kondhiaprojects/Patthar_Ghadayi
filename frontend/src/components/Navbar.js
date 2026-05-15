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
      <Link to="/" className="navbar-logo">Website</Link>

      <div className="navbar-links">
        <Link to="/about">About</Link>
        <Link to="/stories">Stories</Link>
        {user && <Link to="/post">Post a Story</Link>}
      </div>

      <div>
        {user ? (
          <div className="navbar-user" onClick={() => setOpen(p => !p)}>
            <div className="navbar-user-avatar">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <span>{user.username}</span>
            {open && (
              <div className="user-dropdown">
                <Link to="/my-stories" onClick={() => setOpen(false)}>My Stories</Link>
                <button onClick={handleLogout}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="navbar-links">
            <Link to="/auth">Sign In</Link>
            <Link to="/auth?tab=signup">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
