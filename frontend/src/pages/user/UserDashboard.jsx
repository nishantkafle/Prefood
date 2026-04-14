import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, MapPin, Clock3, Clock, ChefHat, UtensilsCrossed, Trash2, ShoppingBag, Plus, Minus, Info, MessageSquare } from 'lucide-react';
import { createAppSocket } from '../../config/socket';
import NotificationBell from '../../components/shared/NotificationBell';
import UserNavbar from '../../components/shared/UserNavbar';
import '../shared/Dashboard.css';

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

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [nearbyActive, userLocation]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile', { withCredentials: true });
      if (response.data.success) {
        setProfile(response.data.data);
        // Set initial location from profile if available
        if (response.data.data.latitude && response.data.data.longitude) {
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
      if (response.data.success) {
        setRestaurants(response.data.data);
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
      if (response.data.success) {
        setMenuItems(response.data.data.menuItems);
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

  // Menu view for a selected restaurant
  if (selectedRestaurant) {
    return (
      <div className="um-page">
        <UserNavbar />
        <div className="um-hero" style={{ 
          background: '#ffffff',
          minHeight: 'auto',
          height: 'auto',
          padding: '30px 40px',
          borderBottom: '1px solid #eaeef4',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button className="um-back-btn" onClick={handleBackToList} style={{ position: 'relative', top: 0, left: 0, margin: 0, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button 
              onClick={handleChatWithRestaurant}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--brand)', color: 'white', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              <MessageSquare size={18} />
              Message Restaurant
            </button>
          </div>
          <div className="um-hero-content" style={{ position: 'relative', top: 0, marginTop: '10px', paddingTop: 0, paddingBottom: 0, alignSelf: 'flex-start' }}>
            <div className="um-hero-badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>Restaurant</div>
            <h1 style={{ color: '#0f172a', margin: '12px 0 16px 0', fontSize: '32px' }}>{selectedRestaurant.restaurantName || 'Restaurant'}</h1>
            <div className="um-hero-meta" style={{ color: '#475569', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {selectedRestaurant.location && <span style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}><MapPin size={16} /> {selectedRestaurant.location}</span>}
              {selectedRestaurant.cuisineType && <span style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}><UtensilsCrossed size={16} /> {selectedRestaurant.cuisineType}</span>}
              {selectedRestaurant.openingTime && selectedRestaurant.closingTime && (
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}><Clock3 size={16} /> {selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}</span>
              )}
            </div>
          </div>
        </div>

        <div className="um-body">
          <div className="um-filter-sidebar">
            <div className="um-filter-header">
              <h3>Menu Categories</h3>
            </div>
            <div className="um-filter-list">
              {[
                { id: 'all', label: 'All Items', color: '#64748b' },
                { id: 'veg', label: 'Vegetarian', color: '#10b981' },
                { id: 'non-veg', label: 'Non-Vegetarian', color: '#ef4444' },
                { id: 'vegan', label: 'Vegan', color: '#84cc16' }
              ].map(f => (
                <div 
                  key={f.id}
                  className={`um-filter-item ${activeFilters.includes(f.id) ? 'active' : f.id}`} 
                  onClick={() => handleFilterToggle(f.id)}
                >
                  <div className="um-filter-item-info">
                    <span className="um-filter-dot" style={{ backgroundColor: f.color }}></span>
                    <span className="um-filter-label">{f.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="um-menu-center">
            <div className="um-menu-topbar">
              <div className="um-menu-info-text">
                <h2>Explore Menu</h2>
                <p>{filteredMenu.length} dishes found</p>
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
                <div className="um-view-toggle">
                  <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
                  <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
                </div>
              </div>
            </div>

            {menuLoading ? (
              <div className="um-loading-state">
                <div className="um-spinner"></div>
                <p>Curating the best dishes for you...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="um-empty-state">
                <Search size={48} />
                <h3>No dishes match your search</h3>
                <p>Try adjusting your filters or search query</p>
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
                            <span title={`Prep time: ${item.prepTime} mins`}><Clock3 size={12} /> {item.prepTime}m</span>
                          </div>
                        </div>
                        <p className="um-food-desc">{item.description}</p>
                        
                        <div className="um-food-bottom">
                          <div className="um-food-price">
                            <span className="currency">NPR</span>
                            <span className="amount">{item.price}</span>
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

          <div className="um-cart-panel">
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
              </div>
            </div>

            <div className="um-cart-body">
              {orderSuccess && (
                <div className="um-status-alert success">
                  <Info size={16} />
                  <span>Pre-order placed successfully!</span>
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
                  <p>Your cart is hungry</p>
                  <span>Add some delicious items from the menu to get started</span>
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
                <div className="um-summary-row">
                  <span>Subtotal</span>
                  <span>NPR {getCartTotal()}</span>
                </div>
                <div className="um-summary-row total">
                  <span>Total Amount</span>
                  <span>NPR {getCartTotal()}</span>
                </div>
              </div>

              <div className="um-checkout-form">
                <div className="um-field">
                  <label><Clock3 size={14} /> Arrival Time</label>
                  <input
                    type="datetime-local"
                    value={dineInAt}
                    min={getCurrentLocalDateTimeValue()}
                    max={getMaxScheduleLocalDateTimeValue()}
                    onChange={(e) => setDineInAt(e.target.value)}
                  />
                </div>
                
                <div className="um-field">
                  <label>Payment Mode</label>
                  <div className="um-payment-grid">
                    <div 
                      className={`um-payment-card ${paymentMethod === 'esewa' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('esewa')}
                    >
                      <div className="um-radio"></div>
                      <span>eSewa App</span>
                    </div>
                    <div 
                      className={`um-payment-card ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <div className="um-radio"></div>
                      <span>Pay at Counter</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="um-place-order-btn" 
                  onClick={handlePlacePreOrder} 
                  disabled={cart.length === 0}
                >
                  {paymentMethod === 'esewa' ? 'Pay & Place Order' : 'Place Pre-Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
            <p>Explore the best restaurants in town and pre-order your favorite dishes.</p>
            
            <div className={`ud-search-box ${searchQuery ? 'active' : ''}`}>
              <Search size={18} className="ud-search-icon" />
              <input
                type="text"
                placeholder="Search restaurants or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ud-search-clear" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>
          </div>
          <div className="ud-hero-bg-accent"></div>
        </div>

        <div className="ud-body">
          <div className="ud-section-header">
            <div>
              <h2>Premium Restaurants</h2>
              <p>Hand-picked dining experiences for you</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {profile?.location && (
                <div className="ud-location-banner">
                  <MapPin size={18} color="var(--brand)" />
                  <div className="ud-location-info">
                    <h5>Current Location</h5>
                    <p>{profile.location}</p>
                  </div>
                  <button className="ud-location-change" onClick={() => navigate('/user/settings')}>
                    Change
                  </button>
                </div>
              )}

              <div className="discovery-actions">
                <button 
                  className={`nearby-toggle-btn ${nearbyActive ? 'active' : ''}`}
                  onClick={toggleNearby}
                  disabled={locating}
                >
                  <MapPin size={16} />
                  {locating ? 'Locating...' : nearbyActive ? 'Showing within 1km' : 'Search Near Me'}
                </button>
              </div>
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
              <h3>{nearbyActive ? "No restaurants found nearby" : "No restaurants found"}</h3>
              {nearbyActive ? (
                <p>There is no any hotel registered in this app near your location. (1km radius)</p>
              ) : (
                <p>Try searching for something else or browse all restaurants.</p>
              )}
              <button 
                onClick={() => { 
                  setSearchQuery(''); 
                  if(nearbyActive) toggleNearby(); 
                }} 
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e7e5e4',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Clear Search
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
                      <div className="ud-card-btn">View Menu</div>
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

