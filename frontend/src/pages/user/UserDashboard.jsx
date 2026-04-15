import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, MapPin, Clock3, Clock, ChefHat, UtensilsCrossed, Trash2, ShoppingBag, Plus, Minus, Info, MessageSquare } from 'lucide-react';
import { createAppSocket } from '../../config/socket';
import NotificationBell from '../../components/shared/NotificationBell';
import UserNavbar from '../../components/shared/UserNavbar';
import '../shared/Dashboard.css';
import './UserDashboard.css';

const getCurrentLocalDateTimeValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getMaxScheduleLocalDateTimeValue = () => {
  const max = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const timezoneOffset = max.getTimezoneOffset() * 60000;
  return new Date(max.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

function UserDashboard() {
  const navigate = useNavigate();
  const socketRef = React.useRef(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const [cart, setCart] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [dineInAt, setDineInAt] = useState(getCurrentLocalDateTimeValue());
  const [orderError, setOrderError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('esewa');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyActive, setNearbyActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [nearbyActive, userLocation]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile', { withCredentials: true });
      if (response.data?.success && response.data?.data) {
        setProfile(response.data.data);
        // Set initial location from profile if available
        if (response.data.data?.latitude && response.data.data?.longitude) {
          setUserLocation({
            lat: parseFloat(response.data.data.latitude),
            lng: parseFloat(response.data.data.longitude),
            fromProfile: true
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userLocation && nearbyActive) {
        params.userLat = userLocation.lat;
        params.userLng = userLocation.lng;
        params.nearby = true;
      } else if (userLocation) {
        params.userLat = userLocation.lat;
        params.userLng = userLocation.lng;
      }

      const response = await axios.get('/api/auth/restaurants', { 
        params,
        withCredentials: true 
      });
      if (response.data?.success) {
        setRestaurants(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNearby = async () => {
    if (nearbyActive) {
      setNearbyActive(false);
      return;
    }

    setLocating(true);
    
    // Check if the user has precise coordinates in their profile
    if (profile?.latitude && profile?.longitude) {
      setUserLocation({
        lat: parseFloat(profile.latitude),
        lng: parseFloat(profile.longitude),
        fromProfile: true
      });
      setNearbyActive(true);
      setLocating(false);
    } else if (profile?.location) {
      // User has a text address but no coordinates, let's geocode it automatically
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profile.location)}`);
        if (response.data && response.data.length > 0) {
          const lat = parseFloat(response.data[0].lat);
          const lng = parseFloat(response.data[0].lon);
          setUserLocation({ lat, lng, fromProfile: true });
          setNearbyActive(true);
        } else {
          // Fallback to text matching if geocoding yields no results
          alert(`Could not find coordinates for "${profile.location}". Please drop a pin on the map in your settings for precise distance search.`);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
        alert("Geocoding failed. Please drop a pin on the map in your profile settings.");
      }
      setLocating(false);
    } else {
      alert("No location set. Please go to your profile settings and set your precise location first.");
      setLocating(false);
    }
  };

  const handleViewMenu = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setMenuLoading(true);
    setCart([]);
    setDineInAt(getCurrentLocalDateTimeValue());
    setOrderError('');
    setPaymentMethod('esewa');
    setActiveFilters(['all']);
    setOrderSuccess(false);
    try {
      const response = await axios.get(`/api/auth/restaurant/${restaurant._id}/menu`, { withCredentials: true });
      if (response.data?.success && response.data?.data) {
        setMenuItems(response.data.data.menuItems || []);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedRestaurant(null);
    setMenuItems([]);
    setCart([]);
    setDineInAt(getCurrentLocalDateTimeValue());
    setOrderError('');
    setPaymentMethod('esewa');
    setActiveFilters(['all']);
    setMenuSearchQuery('');
    setOrderSuccess(false);
  };



  // Filter logic - multi-select
  const handleFilterToggle = (filter) => {
    if (filter === 'all') {
      setActiveFilters(['all']);
      return;
    }
    setActiveFilters(prev => {
      const withoutAll = prev.filter(f => f !== 'all');
      if (withoutAll.includes(filter)) {
        const updated = withoutAll.filter(f => f !== filter);
        return updated.length === 0 ? ['all'] : updated;
      }
      return [...withoutAll, filter];
    });
  };

  const getFilteredMenu = () => {
    let filtered = menuItems;
    if (!activeFilters.includes('all')) {
      filtered = filtered.filter(item => activeFilters.includes(item.category));
    }
    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  // Cart logic
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c._id === item._id);
      if (existing) {
        return prev.map(c => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId, delta) => {
    setCart(prev => {
      return prev.map(c => {
        if (c._id === itemId) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : c;
        }
        return c;
      }).filter(c => c.quantity > 0);
    });
  };

  const setCartQty = (itemId, value) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    if (parsed <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(c => (c._id === itemId ? { ...c, quantity: parsed } : c)));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c._id !== itemId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  };

  const getItemQtyInCart = (itemId) => {
    const item = cart.find(c => c._id === itemId);
    return item ? item.quantity : 0;
  };

  const clearCart = () => {
    setCart([]);
    setOrderError('');
  };

  const submitEsewaForm = (checkoutUrl, payload) => {
    const esewaActionUrl = checkoutUrl || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
    const requiredEsewaFields = [
      'amount',
      'tax_amount',
      'total_amount',
      'transaction_uuid',
      'product_code',
      'product_service_charge',
      'product_delivery_charge',
      'success_url',
      'failure_url',
      'signed_field_names',
      'signature'
    ];

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = esewaActionUrl;
    form.style.display = 'none';

    requiredEsewaFields.forEach((key) => {
      const value = payload?.[key];
      if (value === undefined || value === null) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handlePlacePreOrder = async () => {
    if (cart.length === 0 || !selectedRestaurant?._id) return;

    if (!dineInAt) {
      setOrderError('Please select your dine-in arrival time before placing order.');
      return;
    }

    if (new Date(dineInAt).getTime() < Date.now()) {
      setOrderError('Dine-in arrival time cannot be in the past.');
      return;
    }

    if (new Date(dineInAt).getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      setOrderError('Dine-in arrival time can only be scheduled up to 7 days ahead.');
      return;
    }

    setOrderError('');

    try {
      if (paymentMethod === 'esewa') {
        const response = await axios.post('/api/esewa/initiate', {
          restaurantId: selectedRestaurant._id,
          dineInAt,
          items: cart.map(i => ({ menuItem: i._id, quantity: i.quantity }))
        }, { withCredentials: true });

        if (response.data?.success && response.data?.checkoutUrl && response.data?.payload) {
          submitEsewaForm(response.data.checkoutUrl, response.data.payload);
          return;
        }

        setOrderError(response.data.message || 'Failed to place preorder');
      } else {
        const response = await axios.post('/api/orders/preorder', {
          restaurantId: selectedRestaurant._id,
          dineInAt,
          items: cart.map(i => ({ menuItem: i._id, quantity: i.quantity }))
        }, { withCredentials: true });

        if (response.data?.success) {
          setOrderSuccess(true);
          setCart([]);
          setDineInAt(getCurrentLocalDateTimeValue());
          setTimeout(() => setOrderSuccess(false), 3000);
          return;
        }

        setOrderError(response.data?.message || 'Failed to place preorder');
      }
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to place preorder');
    }
  };

  const handleTrackOrderStatus = () => {
    navigate('/user/orders');
  };

  const handleOpenAllChats = () => {
    navigate('/user/chats');
  };

  const handleChatWithRestaurant = () => {
    if (!selectedRestaurant?._id) return;
    navigate(`/user/chats?restaurantId=${selectedRestaurant._id}`);
  };

  const filteredRestaurants = restaurants.filter(r => {
    const q = searchQuery.toLowerCase();
    return (r.restaurantName || '').toLowerCase().includes(q) ||
           (r.location || '').toLowerCase().includes(q);
  });

  const filteredMenu = getFilteredMenu();
  const categoryDot = { 'veg': '#4caf50', 'non-veg': '#f44336', 'vegan': '#8bc34a' };

  useEffect(() => {
    if (!selectedRestaurant?._id) return undefined;

    socketRef.current = createAppSocket();

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinRestaurantMenu', selectedRestaurant._id);
    });

    socketRef.current.on('menu:itemAdded', (item) => {
      setMenuItems((prev) => {
        const exists = prev.some((menuItem) => menuItem._id === item._id);
        if (exists) return prev;
        return [item, ...prev];
      });
    });

    socketRef.current.on('menu:itemUpdated', (item) => {
      setMenuItems((prev) => prev.map((menuItem) => (menuItem._id === item._id ? item : menuItem)));

      setCart((prev) => {
        if (item.isActive === false) {
          return prev.filter((cartItem) => cartItem._id !== item._id);
        }
        return prev.map((cartItem) => (cartItem._id === item._id ? { ...cartItem, ...item } : cartItem));
      });
    });

    socketRef.current.on('menu:itemDeleted', ({ _id }) => {
      setMenuItems((prev) => prev.filter((menuItem) => menuItem._id !== _id));
      setCart((prev) => prev.filter((cartItem) => cartItem._id !== _id));
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveRestaurantMenu', selectedRestaurant._id);
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [selectedRestaurant?._id]);

  if (selectedRestaurant) {
    return (
      <div className="um-page">
        <UserNavbar />
        <div className="um-hero">
          <div className="um-top-nav">
            <button className="um-back-btn" onClick={handleBackToList}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button 
              className="um-chat-btn"
              onClick={handleChatWithRestaurant}
            >
              <MessageSquare size={18} />
              <span className="desktop-only">Message Restaurant</span>
            </button>
          </div>
          <div className="um-hero-content">
            <div className="um-hero-badge">Restaurant</div>
            <h1>{selectedRestaurant.restaurantName || 'Restaurant'}</h1>
            <div className="um-hero-meta">
              {selectedRestaurant.location && (
                <span className="um-meta-pill">
                  <MapPin size={16} /> {selectedRestaurant.location}
                </span>
              )}
              {selectedRestaurant.cuisineType && (
                <span className="um-meta-pill">
                  <UtensilsCrossed size={16} /> {selectedRestaurant.cuisineType}
                </span>
              )}
              {selectedRestaurant.openingTime && selectedRestaurant.closingTime && (
                <span className="um-meta-pill">
                  <Clock3 size={16} /> {selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="um-body">
          <div className="um-filter-sidebar">
            <div className="um-filter-header desktop-only">
              <h3>Menu Categories</h3>
            </div>
            <div className="um-filter-list">
              {[
                { id: 'all', label: 'All', color: '#64748b' },
                { id: 'veg', label: 'Veg', color: '#10b981' },
                { id: 'non-veg', label: 'Non-Veg', color: '#ef4444' },
                { id: 'vegan', label: 'Vegan', color: '#84cc16' }
              ].map(f => (
                <div 
                  key={f.id}
                  className={`um-filter-item ${activeFilters.includes(f.id) ? 'active' : ''}`} 
                  onClick={() => handleFilterToggle(f.id)}
                >
                  <span className="um-filter-dot" style={{ backgroundColor: f.color }}></span>
                  <span className="um-filter-label">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="um-menu-center">
            <div className="um-menu-topbar">
              <div className="um-menu-info-text">
                <h2>Explore Menu</h2>
                <p>{filteredMenu.length} dishes</p>
              </div>
              <div className="um-menu-actions">
                <div className="um-menu-search">
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Search dishes..." 
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                  />
                </div>
                <div className="um-view-toggle desktop-only">
                  <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
                  <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
                </div>
              </div>
            </div>

            {menuLoading ? (
              <div className="um-loading-state">
                <div className="um-spinner"></div>
                <p>Loading menu...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="um-empty-state">
                <Search size={48} />
                <h3>No dishes found</h3>
              </div>
            ) : (
              <div className={`um-menu-grid ${viewMode === 'list' ? 'um-menu-list-view' : ''}`}>
                {filteredMenu.map(item => {
                  const qtyInCart = getItemQtyInCart(item._id);
                  const isOutOfStock = item.isActive === false;
                  return (
                    <div key={item._id} className={`um-food-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}>
                      <div className="um-food-img">
                        {item.image ? (
                          <img src={item.image} alt={item.name} loading="lazy" />
                        ) : (
                          <div className="um-food-img-placeholder">
                             <UtensilsCrossed size={32} />
                          </div>
                        )}
                        <div className={`um-food-cat-tag ${item.category}`}>
                          {item.category === 'veg' ? 'Veg' : item.category === 'non-veg' ? 'Non-Veg' : 'Vegan'}
                        </div>
                      </div>
                      <div className="um-food-info">
                        <div className="um-food-name-row">
                          <h3>{item.name}</h3>
                          <div className="um-food-meta-icons">
                            <span><Clock3 size={12} /> {item.prepTime}m</span>
                          </div>
                        </div>
                        <p className="um-food-desc">{item.description}</p>
                        
                        <div className="um-food-bottom">
                          <div className="um-food-price">
                            <span className="amount">NPR {item.price}</span>
                          </div>
                          
                          {isOutOfStock ? (
                            <span className="um-stock-badge out">Unavailable</span>
                          ) : qtyInCart === 0 ? (
                            <button className="um-add-to-cart-btn" onClick={() => addToCart(item)}>
                              <Plus size={16} /> Add
                            </button>
                          ) : (
                            <div className="um-qty-bubble">
                              <button onClick={() => updateCartQty(item._id, -1)}><Minus size={14} /></button>
                              <span>{qtyInCart}</span>
                              <button onClick={() => updateCartQty(item._id, 1)}><Plus size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`cart-overlay ${showMobileCart ? 'active' : ''}`} onClick={() => setShowMobileCart(false)} />
          <div className={`um-cart-panel ${showMobileCart ? 'mobile-active' : ''}`}>
            <div className="um-cart-header">
              <div className="um-cart-header-title">
                <ShoppingBag size={20} />
                <h3>Your Order</h3>
              </div>
              <div className="um-cart-header-meta">
                <span className="um-cart-count-badge">{getCartItemCount()}</span>
                {cart.length > 0 && (
                  <button className="um-cart-clear-btn" onClick={clearCart} title="Clear Cart"><Trash2 size={16} /></button>
                )}
                <button className="mobile-only um-cart-close" onClick={() => setShowMobileCart(false)}>×</button>
              </div>
            </div>

            <div className="um-cart-body">
              {orderSuccess && (
                <div className="um-status-alert success">
                  <Info size={16} />
                  <span>Order placed successfully!</span>
                </div>
              )}
              {orderError && (
                <div className="um-status-alert error">
                  <Info size={16} />
                  <span>{orderError}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="um-cart-empty-state">
                  <ShoppingBag size={40} />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="um-cart-items-list">
                  {cart.map(item => (
                    <div key={item._id} className="um-cart-item">
                      <div className="um-cart-item-details">
                        <span className="um-cart-item-name">{item.name}</span>
                        <div className="um-cart-item-meta">
                          <span className={`um-dot ${item.category}`}></span>
                          <span className="um-price-sub">NPR {item.price} each</span>
                        </div>
                      </div>
                      <div className="um-cart-item-actions">
                        <div className="um-cart-qty">
                          <button onClick={() => updateCartQty(item._id, -1)}><Minus size={12} /></button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setCartQty(item._id, e.target.value)}
                          />
                          <button onClick={() => updateCartQty(item._id, 1)}><Plus size={12} /></button>
                        </div>
                        <span className="um-cart-item-total">NPR {item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="um-cart-footer">
              <div className="um-cart-summary">
                <div className="um-summary-row total">
                  <span>Total Amount</span>
                  <span>NPR {getCartTotal()}</span>
                </div>
              </div>

              <div className="um-checkout-form">
                <div className="um-field">
                  <label><Clock size={14} /> Arrival Time</label>
                  <input
                    type="datetime-local"
                    value={dineInAt}
                    min={getCurrentLocalDateTimeValue()}
                    max={getMaxScheduleLocalDateTimeValue()}
                    onChange={(e) => setDineInAt(e.target.value)}
                  />
                </div>
                
                <div className="um-field">
                  <label>Payment</label>
                  <div className="um-payment-grid">
                    <div 
                      className={`um-payment-card ${paymentMethod === 'esewa' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('esewa')}
                    >
                      <span>eSewa</span>
                    </div>
                    <div 
                      className={`um-payment-card ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <span>Cash</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="um-place-order-btn" 
                  onClick={handlePlacePreOrder} 
                  disabled={cart.length === 0}
                >
                  {paymentMethod === 'esewa' ? 'Pay & Order' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {cart.length > 0 && !showMobileCart && (
          <button className="mobile-cart-toggle mobile-only" onClick={() => setShowMobileCart(true)}>
            <ShoppingBag size={20} />
            <span>Cart ({getCartItemCount()})</span>
            <span style={{ marginLeft: 'auto' }}>NPR {getCartTotal()}</span>
          </button>
        )}
      </div>
    );
  }

  // Restaurant listing view
  return (
    <div className="ud-page">
      <UserNavbar />

      <div className="ud-container">
        {/* Discovery Hero */}
        <div className="ud-hero">
          <div className="ud-hero-content">
            <span className="ud-hero-badge">Discover & Reserve</span>
            <h1>Find your next favorite meal</h1>
            <p className="desktop-only">Explore the best restaurants in town and pre-order your favorite dishes.</p>
            
            <div className={`ud-search-box ${searchQuery ? 'active' : ''}`}>
              <Search size={18} className="ud-search-icon" />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ud-search-clear" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>
          </div>
        </div>

        <div className="ud-body">
          <div className="ud-section-header">
            <div className="ud-section-title">
              <h2>Premium Restaurants</h2>
              <p>Hand-picked dining experiences</p>
            </div>
            
            <div className="ud-header-actions">
              {profile?.location && (
                <div className="ud-location-banner">
                  <MapPin size={18} color="var(--brand)" />
                  <div className="ud-location-info">
                    <h5>Location</h5>
                    <p>{profile.location}</p>
                  </div>
                  <button className="ud-location-change" onClick={() => navigate('/user/settings')}>
                    Edit
                  </button>
                </div>
              )}

              <button 
                className={`nearby-toggle-btn ${nearbyActive ? 'active' : ''}`}
                onClick={toggleNearby}
                disabled={locating}
              >
                <MapPin size={16} />
                <span>{locating ? 'Searching...' : nearbyActive ? 'Nearby' : 'Near Me'}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="ud-loading">
              <div className="ud-spinner"></div>
              <p>Finding great places...</p>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="ud-empty">
              <ChefHat size={48} />
              <h3>{nearbyActive ? "No restaurants found nearby" : "No results found"}</h3>
              <p>{nearbyActive ? "No hotels registered within 1km radius." : "Try a different search term."}</p>
              <button 
                className="ud-clear-btn"
                onClick={() => { 
                  setSearchQuery(''); 
                  if(nearbyActive) toggleNearby(); 
                }} 
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="ud-restaurant-grid">
              {filteredRestaurants.map(restaurant => (
                <div 
                  key={restaurant._id} 
                  className="ud-restaurant-card" 
                  onClick={() => handleViewMenu(restaurant)}
                >
                  <div className="ud-card-media">
                    {restaurant.logo ? (
                      <img src={restaurant.logo} alt={restaurant.restaurantName} />
                    ) : (
                      <div className="ud-card-placeholder">
                        <ChefHat size={32} />
                      </div>
                    )}
                    {restaurant.serviceType && (
                      <div className="ud-card-tag">{restaurant.serviceType}</div>
                    )}
                  </div>
                  
                  <div className="ud-card-info">
                    <div className="ud-card-header">
                      <h3>{restaurant.restaurantName || 'Unnamed Restaurant'}</h3>
                      {restaurant.cuisineType && (
                        <span className="ud-card-cuisine">{restaurant.cuisineType}</span>
                      )}
                    </div>
                    
                    <div className="ud-card-meta">
                      <div className="ud-meta-item">
                        <MapPin size={14} />
                        <span>{restaurant.location || 'Unknown Location'}</span>
                      </div>
                      <div className="ud-meta-item">
                        <Clock size={14} />
                        <span>{restaurant.openingTime} - {restaurant.closingTime}</span>
                      </div>
                    </div>
                    
                    <div className="ud-card-footer">
                      <div className="ud-card-btn">Order Now</div>
                      {restaurant.distance !== undefined && restaurant.distance !== null && (
                        <div className="ud-distance-tag">
                          {restaurant.distance < 1 
                            ? `${Math.round(restaurant.distance * 1000)}m away` 
                            : `${restaurant.distance.toFixed(1)}km away`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;

