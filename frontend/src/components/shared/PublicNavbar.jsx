import React from 'react';
import InstallAppButton from './InstallAppButton';

function PublicNavbar({ onLogin, onRegister }) {
  return (
    <header className="ph-header">
      <div className="ph-brand">
        <span className="ph-brand-name">HotStop</span>
      </div>
      <div className="ph-header-actions">
        <InstallAppButton className="ph-install-btn" iconSize={15} />
        <button type="button" className="ph-login-btn" onClick={onLogin}>Login</button>
        <button type="button" className="ph-register-btn" onClick={onRegister}>Register</button>
      </div>
    </header>
  );
}

export default PublicNavbar;