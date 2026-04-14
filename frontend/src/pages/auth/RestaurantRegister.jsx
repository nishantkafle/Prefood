import React, { useState } from 'react';
import { Store, User, Mail, Lock, Eye, EyeOff, MapPin } from 'lucide-react';

function RestaurantRegister({
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
        <label>Restaurant Name</label>
        <div className="auth-input-wrap">
          <Store size={18} />
          <input
            type="text"
            placeholder="e.g. The Green Kitchen"
            value={registerForm.restaurantName}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, restaurantName: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label>Manager Name</label>
        <div className="auth-input-wrap">
          <User size={18} />
          <input
            type="text"
            placeholder="e.g. Alex Smith"
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
            placeholder="business@example.com"
            value={registerForm.email}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
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


      <div className="auth-form-group">
        <label>Display Address</label>
        <div className="auth-input-wrap">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="e.g. Pulchowk, Lalitpur"
            value={registerForm.address}
            onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value, location: e.target.value }))}
            required
          />
        </div>
      </div>

      {authError && <div className="auth-error">{authError}</div>}
      {authSuccess && <div className="auth-success">{authSuccess}</div>}

      <button 
        type="submit" 
        className="auth-submit-btn" 
        disabled={authLoading}
      >
        {authLoading ? 'Registering...' : 'Complete Setup'}
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

export default RestaurantRegister;
