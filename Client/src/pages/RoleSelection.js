import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="role-selection-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <button className="install-btn">Install App</button>
      </div>

      <div className="main-content">
        <h1>Welcome to HotStop</h1>
        <p>Choose your account type to continue</p>
        
        <div className="role-buttons">
          <button className="role-btn user-btn" onClick={() => navigate('/user/login')}>
            User
          </button>
          <button className="role-btn admin-btn" onClick={() => navigate('/admin/login')}>
            Admin
          </button>
          <button className="role-btn restaurant-btn" onClick={() => navigate('/restaurant/login')}>
            Restaurant
          </button>
        </div>
      </div>

      <div className="footer">
        <div className="footer-left">
          <div className="logo">HotStop</div>
          <div className="install-text">Install App</div>
        </div>
        <div className="footer-center">
          © 2025 Copyright, HotStop.com
        </div>
        <div className="footer-right">
          About Us / Contact Us
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
