import { useState } from 'react';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import InkReveal from './ui/ink-reveal';
import type { UserProfile } from '../App';

interface AuthViewProps {
  apiURL: string;
  computedMaskColor: [number, number, number];
  onAuthSuccess: (token: string, user: UserProfile) => void;
}

export default function AuthView({
  apiURL,
  computedMaskColor,
  onAuthSuccess
}: AuthViewProps) {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${apiURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.token, data.user);
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection to server failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${apiURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword })
      });
      const data = await res.json();
      if (res.ok) {
        // Automatically transfer to login screen with prefilled email
        setLoginEmail(regEmail);
        setCurrentView('login');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (err) {
      setAuthError('Connection to server failed');
    }
  };

  return (
    <div className="auth-container">
      <InkReveal maskColor={computedMaskColor} />
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '15px' }}>
            <img src="/logo.svg" className="logo-icon animate-pulse" style={{ height: '48px', width: 'auto' }} alt="Logo" />
            <h1 style={{ margin: 0 }}>AIU</h1>
          </div>
          <p>{currentView === 'login' ? 'Preserve your Legacy & Knowledge' : 'Create your Secure Personal Vault'}</p>
        </div>

        {authError && (
          <div className="error-banner">
            <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
            <span>{authError}</span>
          </div>
        )}

        {currentView === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="you@domain.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="auth-btn">Log In</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            {/* Dummy hidden inputs to prevent Chrome autofill from misaligning fields */}
            <input type="text" name="chrome_dummy_username" style={{ display: 'none' }} />
            <input type="password" name="chrome_dummy_password" style={{ display: 'none' }} />

            <div className="form-group">
              <label>Display Name</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="you@domain.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Secure Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="auth-btn">Register Account</button>
          </form>
        )}

        <div className="auth-footer">
          {currentView === 'login' ? (
            <>
              New to the platform?{' '}
              <span className="auth-link" onClick={() => { setCurrentView('register'); setAuthError(''); }}>
                Register here
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span className="auth-link" onClick={() => { setCurrentView('login'); setAuthError(''); }}>
                Log In
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
