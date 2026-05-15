import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [params] = useSearchParams();
  const [tab, setTab]         = useState(params.get('tab') === 'signup' ? 'signup' : 'login');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername]     = useState('');
  const [regEmail, setRegEmail]           = useState('');
  const [regPassword, setRegPassword]     = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', {
        email: loginEmail, password: loginPassword,
      });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', {
        username: regUsername, email: regEmail, password: regPassword,
      });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-card-wrap">
        <div className="auth-card">
          <h1>{tab === 'login' ? 'Welcome Back' : 'Welcome'}</h1>

          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Login</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError(''); }}>Sign Up</button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="author@journal.com" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>User Name</label>
                <input type="text" placeholder="Username" value={regUsername}
                  onChange={e => setRegUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="author@journal.com" value={regEmail}
                  onChange={e => setRegEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={regPassword}
                  onChange={e => setRegPassword(e.target.value)} required minLength={6} />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Register'}
              </button>
            </form>
          )}

          <p className="auth-fine-print">
            By continuing, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
