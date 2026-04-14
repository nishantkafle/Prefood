import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

function CommonLogin({ 
  loginForm, 
  setLoginForm, 
  handleAuthLogin, 
  authError, 
  authSuccess, 
  authLoading, 
  setAuthMode,
  setAuthError
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <h2>Login</h2>
      <p className="subtitle">Welcome back to HotStop</p>

      <form onSubmit={handleAuthLogin}>
        <div className="auth-form-group">
          <label>Email Address</label>
          <div className="auth-input-wrap">
            <Mail size={18} />
            <input
              type="email"
              placeholder="name@example.com"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="auth-form-group">
          <label>Password</label>
          <div className="auth-input-wrap">
            <Lock size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <button 
              type="button" 
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {authError && <div className="auth-error">{authError}</div>}
        {authSuccess && <div className="auth-success">{authSuccess}</div>}

        <button type="submit" className="auth-submit-btn" disabled={authLoading}>
          {authLoading ? 'Verifying...' : 'Login Now'}
        </button>
      </form>

      <p className="auth-switch-text">
        Don't have an account?
        <button type="button" className="auth-switch-btn" onClick={() => { setAuthMode('register'); setAuthError(''); }}>
          Sign up
        </button>
      </p>
    </>
  );
}

export default CommonLogin;
