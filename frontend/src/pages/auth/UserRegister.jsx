import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

function UserRegister({
  registerForm,
  setRegisterForm,
  handleAuthRegister,
  authError,
  authSuccess,
  authLoading,
  setAuthMode,
  setAuthError
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleAuthRegister}>
      <div className="auth-form-group">
        <label>Full Name</label>
        <div className="auth-input-wrap">
          <User size={18} />
          <input
            type="text"
            placeholder="e.g. John Doe"
            value={registerForm.name}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label>Email Address</label>
        <div className="auth-input-wrap">
          <Mail size={18} />
          <input
            type="email"
            placeholder="name@example.com"
            value={registerForm.email}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label>Create Password</label>
        <div className="auth-input-wrap">
          <Lock size={18} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="At least 6 characters"
            value={registerForm.password}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value, retypePassword: e.target.value }))}
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
        {authLoading ? 'Creating Account...' : 'Get Started'}
      </button>

      <p className="auth-switch-text">
        Already have an account?
        <button type="button" className="auth-switch-btn" onClick={() => { setAuthMode('login'); setAuthError(''); }}>
          Login
        </button>
      </p>
    </form>
  );
}

export default UserRegister;
