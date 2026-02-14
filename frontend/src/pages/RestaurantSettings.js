import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RestaurantSettings({ profile, onUpdate }) {
  const [formData, setFormData] = useState({
    restaurantName: '',
    location: '',
    phone: '',
    cuisineType: '',
    restaurantType: '',
    serviceType: '',
    openingTime: '',
    closingTime: ''
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        restaurantName: profile.restaurantName || '',
        location: profile.location || '',
        phone: profile.phone || '',
        cuisineType: profile.cuisineType || '',
        restaurantType: profile.restaurantType || '',
        serviceType: profile.serviceType || '',
        openingTime: profile.openingTime || '',
        closingTime: profile.closingTime || ''
      });
      setLogoPreview(profile.logo || '');
      setLogoBase64(profile.logo || '');
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.put('http://localhost:4000/api/auth/restaurant/settings', {
        ...formData,
        logo: logoBase64
      }, { withCredentials: true });

      if (response.data.success) {
        setMessage('Settings updated successfully!');
        if (onUpdate) onUpdate();
      } else {
        setError(response.data.message || 'Failed to update settings');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="content-header">
        <div>
          <div className="breadcrumb">Home / Settings</div>
          <h1>Restaurant Settings</h1>
          <p className="subtitle">Update your restaurant information and branding</p>
        </div>
      </div>

      <div className="settings-container">
        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h3>Branding</h3>
            <div className="form-group">
              <label>Restaurant Logo / Photo</label>
              <div className="logo-upload-area">
                {logoPreview ? (
                  <div className="logo-preview-wrap">
                    <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                    <button type="button" className="logo-remove-btn" onClick={() => { setLogoPreview(''); setLogoBase64(''); }}>Change</button>
                  </div>
                ) : (
                  <label className="logo-upload-label">
                    <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                    <span className="logo-upload-icon">📷</span>
                    <span>Click to upload logo (max 5MB)</span>
                  </label>
                )}
              </div>
            </div>

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
          </div>

          <div className="settings-section">
            <h3>Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Location / Address</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9848000000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cuisine Type</label>
                <input
                  type="text"
                  name="cuisineType"
                  value={formData.cuisineType}
                  onChange={handleChange}
                  placeholder="e.g. Italian, Nepali"
                />
              </div>
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
            </div>

            <div className="form-row">
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
              <div className="form-group">
                <label>Opening Time</label>
                <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label>Closing Time</label>
              <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} />
            </div>
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default RestaurantSettings;
