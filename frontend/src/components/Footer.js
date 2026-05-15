import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <img src="/logo.png" alt="Logo" className="footer-logo-img" />
        <span className="footer-logo">Patthar Ghadayi Majdoor Sangh</span>
      </div>
      <span>© {new Date().getFullYear()} Patthar Ghadayi Majdoor Sangh. All rights reserved.</span>
      <div className="footer-links">
        <Link to="/auth">Sign In</Link>
        <Link to="/auth?tab=signup">Register</Link>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </div>
    </footer>
  );
}
