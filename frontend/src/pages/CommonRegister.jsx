import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Download } from 'lucide-react';
import './Auth.css';
import SmallBackButton from '../components/SmallBackButton';

const REGISTER_OPTIONS = [
  { label: 'Customer', value: 'user' },
  { label: 'Restaurant', value: 'restaurant' }
];

function getDefaultRole(pathname) {
  if (pathname.includes('/restaurant')) return 'restaurant';
  return 'user';
}

function CommonRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(getDefaultRole(location.pathname));

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    location: '',
    phone: '',
    password: '',
    retypePassword: ''
  });

  const [restaurantData, setRestaurantData] = useState({
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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loginPath = useMemo(() => {
    if (role === 'restaurant') return '/restaurant/login';
    return '/user/login';
  }, [role]);

  const handleUserChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleRestaurantChange = (e) => {
    setRestaurantData({ ...restaurantData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
  };

  const submitUserRegister = async () => {
    if (userData.password !== userData.retypePassword) {
      throw new Error('Passwords do not match');
    }

    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    return axios.post(
      '/api/auth/register',
      {
        name: userData.name,
        email: userData.email,
        location: userData.location,
        phone: userData.phone,
        password: userData.password,
        role: 'user'
      },
      { withCredentials: true }
    );
  };

  const submitRestaurantRegister = async () => {
    if (!restaurantData.ownerName || !restaurantData.email || !restaurantData.password) {
      throw new Error('Please fill in all required fields');
    }

    if (restaurantData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    return axios.post(
      '/api/auth/register',
      {
        name: restaurantData.ownerName,
        email: restaurantData.email,
        password: restaurantData.password,
        role: 'restaurant',
        restaurantName: restaurantData.restaurantName,
        logo: logoBase64,
        location: restaurantData.address,
        phone: restaurantData.phone,
        cuisineType: restaurantData.cuisineType,
        restaurantType: restaurantData.restaurantType,
        serviceType: restaurantData.serviceType,
        openingTime: restaurantData.openingTime,
        closingTime: restaurantData.closingTime
      },
      { withCredentials: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = role === 'restaurant'
        ? await submitRestaurantRegister()
        : await submitUserRegister();

      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate(loginPath);
        }, 1500);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-actions">
          <Link className="nav-login-link" to={loginPath}>Login</Link>
          <button type="button" className="install-btn" aria-label="Install App" title="Install App">
            <Download size={20} />
            <span>Install App</span>
          </button>
        </div>
      </div>

      <div className="auth-content">
        <div className={`auth-card ${role === 'restaurant' ? 'restaurant-card' : ''}`}>
          <SmallBackButton />
          <h2>Create Your Account</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Register As</label>
              <select
                name="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                className="role-select"
              >
                {REGISTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {role === 'user' ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleUserChange}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={userData.location}
                      onChange={handleUserChange}
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
                      value={userData.email}
                      onChange={handleUserChange}
                      placeholder="Enter email"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={userData.phone}
                      onChange={handleUserChange}
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
                      value={userData.password}
                      onChange={handleUserChange}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Retype Password</label>
                    <input
                      type="password"
                      name="retypePassword"
                      value={userData.retypePassword}
                      onChange={handleUserChange}
                      placeholder="Retype password"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-section">
                  <h3>Restaurant Details</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Restaurant Name</label>
                      <input
                        type="text"
                        name="restaurantName"
                        value={restaurantData.restaurantName}
                        onChange={handleRestaurantChange}
                        placeholder="e.g. The Burger Joint"
                      />
                    </div>
                    <div className="form-group">
                      <label>Cuisine Type</label>
                      <input
                        type="text"
                        name="cuisineType"
                        value={restaurantData.cuisineType}
                        onChange={handleRestaurantChange}
                        placeholder="e.g. Italian, Indian, Fast Food"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Restaurant Type</label>
                      <select name="restaurantType" value={restaurantData.restaurantType} onChange={handleRestaurantChange}>
                        <option value="">Select type</option>
                        <option value="fine-dining">Fine Dining</option>
                        <option value="casual">Casual</option>
                        <option value="fast-food">Fast Food</option>
                        <option value="cafe">Cafe</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Service Type</label>
                      <select name="serviceType" value={restaurantData.serviceType} onChange={handleRestaurantChange}>
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
                      <input type="time" name="openingTime" value={restaurantData.openingTime} onChange={handleRestaurantChange} />
                    </div>
                    <div className="form-group">
                      <label>Closing Time</label>
                      <input type="time" name="closingTime" value={restaurantData.closingTime} onChange={handleRestaurantChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Restaurant Address</label>
                    <input
                      type="text"
                      name="address"
                      value={restaurantData.address}
                      onChange={handleRestaurantChange}
                      placeholder="Full street address, City, Zip Code"
                    />
                  </div>

                  <div className="form-group">
                    <label>Restaurant Logo / Photo</label>
                    <div className="logo-upload-area">
                      {logoPreview ? (
                        <div className="logo-preview-wrap">
                          <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                          <button
                            type="button"
                            className="logo-remove-btn"
                            onClick={() => {
                              setLogoPreview('');
                              setLogoBase64('');
                            }}
                          >
                            Remove
                          </button>
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
                        value={restaurantData.ownerName}
                        onChange={handleRestaurantChange}
                        placeholder="e.g. John Doe"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={restaurantData.email}
                        onChange={handleRestaurantChange}
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
                      value={restaurantData.phone}
                      onChange={handleRestaurantChange}
                      placeholder="(555)000-0000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={restaurantData.password}
                      onChange={handleRestaurantChange}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <div className="terms-checkbox">
                  <input type="checkbox" id="terms" required />
                  <label htmlFor="terms">I agree to the Terms & Conditions and Privacy Policy</label>
                </div>
              </>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className={`submit-btn ${role === 'restaurant' ? 'restaurant-submit' : ''}`} disabled={loading}>
              {loading ? 'Submitting...' : 'Sign up'}
            </button>
          </form>

          <p className="auth-link">
            Already have an account? <Link to={loginPath}>Login here</Link>
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

export default CommonRegister;

