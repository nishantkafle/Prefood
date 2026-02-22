import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';
import SmallBackButton from '../components/SmallBackButton';

function RestaurantRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    phone: '',
    cuisineType: '',
    restaurantType: '',
    serviceType: '',
    openingTime: '',
    closingTime: '',
    address: '',
    password: ''
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setLogoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.ownerName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:4000/api/auth/register', {
        name: formData.ownerName,
        email: formData.email,
        password: formData.password,
        role: 'restaurant',
        restaurantName: formData.restaurantName,
        logo: logoBase64,
        location: formData.address,
        phone: formData.phone,
        cuisineType: formData.cuisineType,
        restaurantType: formData.restaurantType,
        serviceType: formData.serviceType,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime
      }, { withCredentials: true });

      if (response.data.success) {
        setSuccess('Registration successful! Your restaurant will be reviewed by admin. Redirecting to login...');
        setTimeout(() => {
          navigate('/restaurant/login');
        }, 2000);
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
        <button className="install-btn">Install App</button>
      </div>

      <div className="auth-content">
        <div className="auth-card restaurant-card">
          <SmallBackButton />
          <h2>Restaurant Registration</h2>
          <p className="subtitle">Join our network and start reaching new hungry customers today. Complete the form below to get started.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Restaurant Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Restaurant Name</label>
                  <input
                    type="text"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    placeholder="e.g. The Burger Joint"
                  />
                </div>

                <div className="form-group">
                  <label>Cuisine Type</label>
                  <input
                    type="text"
                    name="cuisineType"
                    value={formData.cuisineType}
                    onChange={handleChange}
                    placeholder="e.g. Italian, Indian, Fast Food"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Restaurant Type</label>
                  <select name="restaurantType" value={formData.restaurantType} onChange={handleChange}>
                    <option value="">Select type</option>
                    <option value="fine-dining">Fine Dining</option>
                    <option value="casual">Casual</option>
                    <option value="fast-food">Fast Food</option>
                    <option value="cafe">Cafe</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Service Type</label>
                  <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                    <option value="">Select services</option>
                    <option value="dine-in">Dine In</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Opening Time</label>
                  <input
                    type="time"
                    name="openingTime"
                    value={formData.openingTime}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Closing Time</label>
                  <input
                    type="time"
                    name="closingTime"
                    value={formData.closingTime}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Restaurant Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full street address, City, Zip Code"
                />
              </div>

              <div className="form-group">
                <label>Restaurant Logo / Photo</label>
                <div className="logo-upload-area">
                  {logoPreview ? (
                    <div className="logo-preview-wrap">
                      <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                      <button type="button" className="logo-remove-btn" onClick={() => { setLogoPreview(''); setLogoBase64(''); }}>Remove</button>
                    </div>
                  ) : (
                    <label className="logo-upload-label">
                      <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                      <span className="logo-upload-icon">Upload</span>
                      <span>Click to upload logo (max 5MB)</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Owner Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Owner Name</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555)000-0000"
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
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="terms-checkbox">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">I agree to the Terms & Conditions and Privacy Policy</label>
            </div>

            <button type="submit" className="submit-btn restaurant-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
            <p className="info-text">Your restaurant will be reviewed by admin before activation.</p>
          </form>

          <p className="auth-link">
            Already have an account? <Link to="/restaurant/login">Login here</Link>
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

export default RestaurantRegister;
