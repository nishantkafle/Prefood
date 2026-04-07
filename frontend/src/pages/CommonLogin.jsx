import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Download } from 'lucide-react';
import './Auth.css';

const DASHBOARD_BY_ROLE = {
  user: '/user/dashboard',
  restaurant: '/restaurant/dashboard',
  admin: '/admin/dashboard'
};

const LOGIN_ROLES = ['user', 'restaurant', 'admin'];

function CommonLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
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
      let finalError = 'Login failed';

      for (const role of LOGIN_ROLES) {
        const response = await axios.post(
          '/api/auth/login',
          {
            ...formData,
            role
          },
          { withCredentials: true }
        );

        if (response.data?.success) {
          const token = response.data?.token;
          if (token) {
            localStorage.setItem('authToken', token);
          }
          const accountRole = response.data?.data?.role || role;
          navigate(DASHBOARD_BY_ROLE[accountRole] || '/user/dashboard');
          return;
        }

        finalError = response.data?.message || finalError;

        if (finalError === 'Invalid Password' || finalError === 'Invalid email') {
          break;
        }
      }

      setError(finalError);
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
        <div className="header-actions">
          <Link className="nav-login-link" to="/login" aria-current="page">Login</Link>
          <button type="button" className="install-btn" aria-label="Install App" title="Install App">
            <Download size={20} />
            <span>Install App</span>
          </button>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <h2>Welcome to HotStop</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="auth-link">
            Don&apos;t have an account? <Link to="/register">Register here</Link>
          </p>
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

export default CommonLogin;

