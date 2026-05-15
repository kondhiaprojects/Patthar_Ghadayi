import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer-logo">StoryVault</span>
      <span>© {new Date().getFullYear()} StoryVault. All rights reserved.</span>
      <div className="footer-links">
        <Link to="/auth">Sign In</Link>
        <Link to="/auth?tab=signup">Register</Link>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </div>
    </footer>
  );
}
