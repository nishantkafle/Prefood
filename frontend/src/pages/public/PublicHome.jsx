import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Store, Clock3, MapPin } from 'lucide-react';
import AppFooter from '../../components/shared/AppFooter';
import PublicNavbar from '../../components/shared/PublicNavbar';
import AuthModal from '../auth/AuthModal';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import './PublicHome.css';
import '../shared/Auth.css';

const DASHBOARD_BY_ROLE = {
  user: '/user/dashboard',
  restaurant: '/restaurant/dashboard',
  admin: '/admin/dashboard'
};

const LOGIN_ROLES = ['user', 'restaurant', 'admin'];

function PublicHome() {
  const navigate = useNavigate();
  const [featuredRestaurants, setFeaturedRestaurants] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [bannerImage, setBannerImage] = useState('');
  const [search, setSearch] = useState('');

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    role: 'user',
    name: '',
    email: '',
    phone: '',
    password: '',
    retypePassword: '',
    restaurantName: '',
    ownerName: '',
    cuisineType: '',
    restaurantType: '',
    serviceType: '',
    openingTime: '',
    closingTime: '',
    address: '',
    logo: '',
    latitude: null,
    longitude: null
  });
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const [homeRes, restaurantsRes] = await Promise.all([
          axios.get('/api/auth/public/home-data'),
          axios.get('/api/auth/public/restaurants')
        ]);

        if (homeRes.data?.success) {
          setFeaturedRestaurants(homeRes.data?.data?.featuredRestaurants || []);
          setBannerImage(homeRes.data?.data?.bannerImage || '');
        }

        if (restaurantsRes.data?.success) {
          setAllRestaurants(restaurantsRes.data?.data || []);
        }
      } catch (error) {
        setFeaturedRestaurants([]);
        setAllRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRestaurants;
    return allRestaurants.filter((restaurant) => {
      return (restaurant.restaurantName || '').toLowerCase().includes(q)
        || (restaurant.location || '').toLowerCase().includes(q)
        || (restaurant.cuisineType || '').toLowerCase().includes(q);
    });
  }, [allRestaurants, search]);

  const handleViewMenu = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setMenuLoading(true);
    try {
      const response = await axios.get(`/api/auth/public/restaurant/${restaurant._id}/menu`);
      if (response.data?.success) {
        setMenuItems(response.data?.data?.menuItems || []);
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const closeMenuDrawer = () => {
    setSelectedRestaurant(null);
    setMenuItems([]);
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthSuccess('');
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthLoading(false);
    setAuthError('');
    setAuthSuccess('');
  };

  const handleAuthLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      let finalError = 'Login failed';

      for (const role of LOGIN_ROLES) {
        const response = await axios.post(
          '/api/auth/login',
          {
            email: loginForm.email,
            password: loginForm.password,
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
        if (finalError === 'Invalid Password' || finalError === 'Invalid email') break;
      }

      setAuthError(finalError);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (registerForm.role === 'user' && registerForm.password !== registerForm.retypePassword) {
      setAuthError('Passwords do not match');
      return;
    }

    if (registerForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (registerForm.role === 'restaurant' && (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.restaurantName)) {
      setAuthError('Please fill in all required restaurant owner fields');
      return;
    }

    setAuthLoading(true);
    try {
      const payload = registerForm.role === 'restaurant'
        ? {
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          role: 'restaurant',
          restaurantName: registerForm.restaurantName,
          logo: registerForm.logo,
          location: registerForm.address,
          phone: registerForm.phone,
          cuisineType: registerForm.cuisineType,
          restaurantType: registerForm.restaurantType,
          serviceType: registerForm.serviceType,
          openingTime: registerForm.openingTime,
          closingTime: registerForm.closingTime
        }
        : {
          name: registerForm.name,
          email: registerForm.email,
          location: '',
          phone: registerForm.phone,
          password: registerForm.password,
          role: 'user'
        };

      const response = await axios.post('/api/auth/register', payload, { withCredentials: true });

      if (response.data?.success) {
        setAuthSuccess('Registration successful. Please login now.');
        setLoginForm((prev) => ({ ...prev, email: registerForm.email }));
        setAuthMode('login');
        setRegisterForm((prev) => ({
          ...prev,
          role: 'user',
          name: '',
          email: '',
          phone: '',
          password: '',
          retypePassword: '',
          restaurantName: '',
          ownerName: '',
          cuisineType: '',
          restaurantType: '',
          serviceType: '',
          openingTime: '',
          closingTime: '',
          address: '',
          logo: ''
        }));
        setLogoPreview('');
      } else {
        setAuthError(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAuthError('Logo must be less than 5MB');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');
      const imageUrl = await uploadImageToCloudinary(file);
      setRegisterForm((prev) => ({ ...prev, logo: imageUrl }));
      setLogoPreview(imageUrl);
    } catch (err) {
      setAuthError(err.message || 'Failed to upload logo');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="ph-page">

      {/* ── HEADER ── */}
      <PublicNavbar onLogin={() => openAuthModal('login')} onRegister={() => openAuthModal('register')} />

      {/* ── MODERN HERO SECTION ── */}
      <section className="ph-banner-section">
        <div className="ph-banner-wrap">
          <div className="ph-banner-placeholder">
            <div className="ph-hero-tag">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-deep)', display: 'inline-block' }} />
              Premium Preordering
            </div>
            <h1>The smarter way to dine out</h1>
            <p>
              HotStop connects you with the best local restaurants. Browse menus, 
              preorder your favorites, and enjoy your meal without the wait.
            </p>
            <div className="ph-hero-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button type="button" className="ph-register-btn" style={{ padding: '14px 32px', fontSize: '16px' }} onClick={() => openAuthModal('register')}>
                Get Started
              </button>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200" 
            alt="Modern Restaurant" 
            className="ph-banner-image" 
          />
        </div>
      </section>

      {/* ── FLOATING SEARCH ── */}
      <section className="ph-all-search-wrap">
        <div className="ph-search-wrap">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by restaurant name, cuisine, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* ── FEATURED SECTION ── */}
      <section className="ph-full-section">
        <div className="ph-section-head">
          <h2>Featured Restaurants</h2>
          <span>Handpicked for you</span>
        </div>
        <div className="ph-grid">
          {(featuredRestaurants || []).slice(0, 8).map((restaurant) => (
            <article className="ph-card" key={restaurant?._id}>
              <div className="ph-card-top">
                {restaurant?.logo ? (
                  <img src={restaurant.logo} alt={restaurant.restaurantName} className="ph-logo" />
                ) : (
                  <div className="ph-logo-fallback"><Store size={32} /></div>
                )}
                <div>
                  <h3>{restaurant?.restaurantName || 'Restaurant'}</h3>
                  <p>{restaurant?.cuisineType || 'Cuisine not set'}</p>
                </div>
              </div>
              <div className="ph-meta">
                <span><MapPin size={16} /> {restaurant?.location || 'Location not set'}</span>
                <span><Clock3 size={16} /> {restaurant?.openingTime && restaurant?.closingTime ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Hours not set'}</span>
              </div>
              <button type="button" className="ph-view-btn" onClick={() => handleViewMenu(restaurant)}>See Menu</button>
            </article>
          ))}
          {!loading && (!featuredRestaurants || featuredRestaurants.length === 0) && (
            <div className="ph-empty">No featured restaurants available yet.</div>
          )}
        </div>
      </section>

      {/* ── ALL RESTAURANTS SECTION ── */}
      <section className="ph-full-section">
        <div className="ph-section-head">
          <h2>Explore More</h2>
          <span>Discover local favorites</span>
        </div>
        <div className="ph-grid">
          {filteredRestaurants.map((restaurant) => (
            <article className="ph-card" key={restaurant._id}>
              <div className="ph-card-top">
                {restaurant.logo ? (
                  <img src={restaurant.logo} alt={restaurant.restaurantName} className="ph-logo" />
                ) : (
                  <div className="ph-logo-fallback"><Store size={32} /></div>
                )}
                <div>
                  <h3>{restaurant.restaurantName || 'Restaurant'}</h3>
                  <p>{restaurant.cuisineType || 'Cuisine not set'}</p>
                </div>
              </div>
              <div className="ph-meta">
                <span><MapPin size={16} /> {restaurant.location || 'Location not set'}</span>
              </div>
              <button type="button" className="ph-view-btn" onClick={() => handleViewMenu(restaurant)}>See Menu</button>
            </article>
          ))}
          {!loading && filteredRestaurants.length === 0 && (
            <div className="ph-empty">No restaurants match your search.</div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <AppFooter />

      {/* ── MENU MODAL ── */}
      {selectedRestaurant && (
        <div className="ph-modal-overlay" onClick={closeMenuDrawer}>
          <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ph-modal-head">
              <h3>{selectedRestaurant.restaurantName} Menu</h3>
              <button type="button" onClick={closeMenuDrawer}>Close</button>
            </div>

            {menuLoading ? (
              <div className="ph-empty">Loading menu…</div>
            ) : menuItems.length === 0 ? (
              <div className="ph-empty">Menu not available.</div>
            ) : (
              <div className="ph-menu-list">
                {menuItems.map((item) => (
                  <div key={item._id} className="ph-menu-item">
                    <div className="ph-menu-info">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <span>NPR {Number(item.price || 0).toFixed(2)}</span>
                    </div>
                    <button type="button" className="ph-order-btn" onClick={() => openAuthModal('register')}>
                      Order Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {authModalOpen && (
        <AuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          closeAuthModal={closeAuthModal}
          authLoading={authLoading}
          authError={authError}
          authSuccess={authSuccess}
          setAuthError={setAuthError}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          handleAuthLogin={handleAuthLogin}
          registerForm={registerForm}
          setRegisterForm={setRegisterForm}
          handleAuthRegister={handleAuthRegister}
          handleLogoChange={handleLogoChange}
          logoPreview={logoPreview}
          setLogoPreview={setLogoPreview}
        />
      )}

    </div>
  );
}

export default PublicHome;