import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Download } from 'lucide-react';
import './Auth.css';

function RestaurantLogin() {
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
      const response = await axios.post('/api/auth/login', {
        ...formData,
        role: 'restaurant'
      }, { withCredentials: true });

      if (response.data.success) {
        navigate('/restaurant/dashboard');
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
        <button type="button" className="install-btn" aria-label="Install App" title="Install App">
          <Download size={20} />
          <span>Install App</span>
        </button>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <h2>Welcome to HotStop</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
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
            Don't have an account? <Link to="/restaurant/register">Register here</Link>
          </p>
        </div>
      </div>

      <div className="footer">
        <div className="footer-left">
          <div className="logo">HotStop</div>
          <div className="install-text">Install App</div>
        </div>
        <div className="footer-center">
          (c) 2025 Copyright, HotStop.com
        </div>
        <div className="footer-right">
          About Us / Contact Us
        </div>
      </div>
    </div>
  );
}

export default RestaurantLogin;

