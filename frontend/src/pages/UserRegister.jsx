



import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Download } from 'lucide-react';
import './Auth.css';
import SmallBackButton from '../components/SmallBackButton';

function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    phone: '',
    password: '',
    retypePassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.retypePassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        location: formData.location,
        phone: formData.phone,
        password: formData.password,
        role: 'user'
      }, { withCredentials: true });

      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/user/login');
        }, 1500);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      if (err.response) {
        // Server responded with error
        setError(err.response.data?.message || 'Registration failed. Please try again.');
      } else if (err.request) {
        // Request made but no response
        setError('Unable to connect to server. Please check your connection.');
      } else {
        // Something else happened
        setError('An error occurred. Please try again.');
      }
      console.error('Registration error:', err);
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
          <SmallBackButton />
          <h2>Welcome to HotStop</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter location"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Create Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Retype Password</label>
                <input
                  type="password"
                  name="retypePassword"
                  value={formData.retypePassword}
                  onChange={handleChange}
                  placeholder="Retype password"
                  required
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign up'}
            </button>
          </form>

          <p className="auth-link">
            Already have an account? <Link to="/user/login">Login here</Link>
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

export default UserRegister;

