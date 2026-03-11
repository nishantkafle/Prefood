import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';
import SmallBackButton from '../components/SmallBackButton';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:4000/api/auth/login',
        { ...formData, role: 'admin' },
        { withCredentials: true }
      );
      if (response.data.success) {
        navigate('/admin/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <button className="install-btn">Install App</button>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <SmallBackButton />
          <div className="admin-badge">Admin Portal</div>
          <h2>Admin Login</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <div className="footer">
        <div className="footer-left">
          <div className="logo">HotStop</div>
          <div className="install-text">Install App</div>
        </div>
        <div className="footer-center">(c) 2025 Copyright, HotStop.com</div>
        <div className="footer-right">About Us / Contact Us</div>
      </div>
    </div>
  );
}

export default AdminLogin;
