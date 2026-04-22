import React from 'react';


function PublicNavbar({ onLogin, onRegister }) {
  return (
    <header className="ph-header">
      <div className="ph-section-container" style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
        <div className="ph-brand">
          <img src="/logo.png" alt="HotStop Logo" style={{ maxWidth: '250px', maxHeight: '70px', objectFit: 'contain' }} />
        </div>
        <div className="ph-header-actions">
          <button type="button" className="ph-login-btn" onClick={onLogin}>Log In</button>
          <button type="button" className="ph-register-btn" onClick={onRegister}>Join Now</button>
        </div>
      </div>
    </header>
  );
}

export default PublicNavbar;