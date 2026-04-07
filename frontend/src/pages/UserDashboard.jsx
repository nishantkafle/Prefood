import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessagesSquare, MessageCircle, ClipboardList, LogOut, ArrowLeft } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import './Dashboard.css';

function UserDashboard() {
  const navigate = useNavigate();
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
  const [dineInAt, setDineInAt] = useState('');
  const [orderError, setOrderError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('esewa');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/restaurants', { withCredentials: true });
      if (response.data.success) {
        setRestaurants(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMenu = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setMenuLoading(true);
    setCart([]);
    setDineInAt('');
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
    setDineInAt('');
    setOrderError('');
    setPaymentMethod('esewa');
    setActiveFilters(['all']);
    setOrderSuccess(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/user/login');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('authToken');
      navigate('/user/login');
    }
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
    if (activeFilters.includes('all')) return menuItems;
    return menuItems.filter(item => activeFilters.includes(item.category));
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
          setDineInAt('');
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
           (r.cuisineType || '').toLowerCase().includes(q) ||
           (r.location || '').toLowerCase().includes(q);
  });

  const filteredMenu = getFilteredMenu();
  const categoryDot = { 'veg': '#4caf50', 'non-veg': '#f44336', 'vegan': '#8bc34a' };

  // Menu view for a selected restaurant
  if (selectedRestaurant) {
    return (
      <div className="um-page">
        <div className="um-hero">
          <button className="um-back-btn" onClick={handleBackToList}>
            <ArrowLeft size={22} />
          </button>
          <div className="um-hero-actions">
            <NotificationBell />
            <button className="um-hero-btn" onClick={handleChatWithRestaurant} aria-label="Chat" title="Chat"><MessageCircle size={22} /></button>
            <button className="um-hero-btn" onClick={handleOpenAllChats} aria-label="All Chats" title="All Chats"><MessagesSquare size={22} /></button>
            <button className="um-hero-btn" onClick={handleTrackOrderStatus} aria-label="Track Orders" title="Track Orders"><ClipboardList size={22} /></button>
            <button className="um-hero-btn um-hero-btn-danger" onClick={handleLogout} aria-label="Logout" title="Logout"><LogOut size={22} /></button>
          </div>
          <div className="um-hero-content">
            <h1>{selectedRestaurant.restaurantName || 'Restaurant'}</h1>
            <div className="um-hero-meta">
              {selectedRestaurant.location && <span>{selectedRestaurant.location}</span>}
              {selectedRestaurant.cuisineType && <span>{selectedRestaurant.cuisineType}</span>}
              {selectedRestaurant.openingTime && selectedRestaurant.closingTime && (
                <span>{selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}</span>
              )}
            </div>
          </div>
        </div>

        <div className="um-body">
          <div className="um-filter-sidebar">
            <div className="um-filter-header">
              <span>Filters</span>
              <span className="um-filter-icon">Menu</span>
            </div>
            <div className="um-filter-list">
              <div className={`um-filter-item ${activeFilters.includes('all') ? 'active' : ''}`} onClick={() => handleFilterToggle('all')}>
                <span className="um-filter-label">All</span>
                <span className="um-filter-dot" style={{ background: '#9e9e9e' }}></span>
              </div>
              <div className={`um-filter-item ${activeFilters.includes('veg') ? 'active' : ''}`} onClick={() => handleFilterToggle('veg')}>
                <span className="um-filter-label">Veg</span>
                <span className="um-filter-dot" style={{ background: '#4caf50' }}></span>
              </div>
              <div className={`um-filter-item ${activeFilters.includes('non-veg') ? 'active' : ''}`} onClick={() => handleFilterToggle('non-veg')}>
                <span className="um-filter-label">Non-Veg</span>
                <span className="um-filter-dot" style={{ background: '#f44336' }}></span>
              </div>
              <div className={`um-filter-item ${activeFilters.includes('vegan') ? 'active' : ''}`} onClick={() => handleFilterToggle('vegan')}>
                <span className="um-filter-label">Vegan</span>
                <span className="um-filter-dot" style={{ background: '#8bc34a' }}></span>
              </div>
            </div>
          </div>

          <div className="um-menu-center">
            <div className="um-menu-topbar">
              <div>
                <h2>Explore Menu</h2>
                <p className="um-menu-subtitle">{filteredMenu.length} items available for your selected filters</p>
              </div>
              <div className="um-view-toggle">
                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
              </div>
            </div>

            {menuLoading ? (
              <div className="loading">Loading menu...</div>
            ) : filteredMenu.length === 0 ? (
              <div className="empty-state"><p>No items found for selected filters.</p></div>
            ) : (
              <div className={`um-menu-grid ${viewMode === 'list' ? 'um-menu-list-view' : ''}`}>
                {filteredMenu.map(item => {
                  const qtyInCart = getItemQtyInCart(item._id);
                  return (
                    <div key={item._id} className="um-food-card">
                      <div className="um-food-img">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="um-food-img-placeholder">No Image</div>
                        )}
                      </div>
                      <div className="um-food-info">
                        <div className="um-food-name-row">
                          <h3>{item.name}</h3>
                          <span className="um-food-dot" style={{ background: categoryDot[item.category] || '#999' }}></span>
                        </div>
                        <p className="um-food-desc">{item.description}</p>
                        <div className="um-food-meta">
                          <span className="um-food-category">
                            {item.category === 'veg' ? 'Veg' : item.category === 'non-veg' ? 'Non-Veg' : 'Vegan'}
                          </span>
                          <span>Prep: {item.prepTime} min</span>
                        </div>
                        <div className="um-food-bottom">
                          <span className="um-food-price">NPR {item.price}</span>
                          {qtyInCart === 0 ? (
                            <button className="um-add-btn" onClick={() => addToCart(item)}>Add</button>
                          ) : (
                            <div className="um-qty-control">
                              <button onClick={() => updateCartQty(item._id, -1)}>-</button>
                              <span>{qtyInCart}</span>
                              <button onClick={() => updateCartQty(item._id, 1)}>+</button>
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
              <div>
                <div className="um-cart-title">Your Cart</div>
                <p className="um-cart-subtitle">Ready for dine-in pre-order</p>
              </div>
              <div className="um-cart-header-actions">
                <span className="um-cart-count">{getCartItemCount()} items</span>
                {cart.length > 0 && (
                  <button className="um-cart-clear" onClick={clearCart}>Clear</button>
                )}
              </div>
            </div>

            {orderSuccess && <div className="um-order-success">Pre-order placed successfully.</div>}
            {orderError && <div className="um-order-error">{orderError}</div>}

            {cart.length === 0 ? (
              <div className="um-cart-empty">
                <p>Cart is empty</p>
                <span>Add dishes from the menu to continue</span>
              </div>
            ) : (
              <div className="um-cart-items">
                {cart.map(item => (
                  <div key={item._id} className="um-cart-item">
                    <div className="um-cart-item-left">
                      <div className="um-cart-item-dot" style={{ background: categoryDot[item.category] || '#999' }}></div>
                      <div className="um-cart-item-info">
                        <span className="um-cart-item-name">{item.name}</span>
                        <span className="um-cart-item-cat">
                          {item.category === 'veg' ? 'Veg' : item.category === 'non-veg' ? 'Non-Veg' : 'Vegan'}
                        </span>
                      </div>
                    </div>
                    <div className="um-cart-item-right">
                      <span className="um-cart-item-price">NPR {item.price * item.quantity}</span>
                      <div className="um-cart-item-qty">
                        <button onClick={() => updateCartQty(item._id, -1)}>-</button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => setCartQty(item._id, e.target.value)}
                        />
                        <button onClick={() => updateCartQty(item._id, 1)}>+</button>
                      </div>
                      <button className="um-cart-item-remove" onClick={() => removeFromCart(item._id)}>X</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="um-cart-footer">
              <div className="um-cart-total-row">
                <span>Total</span>
                <span className="um-cart-total-amount">NPR {getCartTotal()}</span>
              </div>
              <div className="um-dinein-time-wrap">
                <label htmlFor="dineInAt" className="um-dinein-time-label">What time are you coming for dine-in?</label>
                <input
                  id="dineInAt"
                  type="datetime-local"
                  className="um-dinein-time-input"
                  value={dineInAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setDineInAt(e.target.value)}
                />
              </div>
              <div className="um-payment-method-wrap">
                <div className="um-payment-method-label">Payment Method</div>
                <label className="um-payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="esewa"
                    checked={paymentMethod === 'esewa'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>eSewa</span>
                </label>
                <label className="um-payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Pay at Restaurant (Cash)</span>
                </label>
              </div>
              <button className="um-preorder-btn" onClick={handlePlacePreOrder} disabled={cart.length === 0}>
                {paymentMethod === 'esewa' ? 'Pay with eSewa & Place Pre-Order' : 'Place Dine-In Pre-Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Restaurant listing view
  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right">
          <NotificationBell />
          <button className="install-btn" onClick={handleOpenAllChats} aria-label="All Chats" title="All Chats"><MessagesSquare size={22} /></button>
          <button className="install-btn" onClick={handleTrackOrderStatus} aria-label="Track Order Status" title="Track Order Status"><ClipboardList size={22} /></button>
          <button className="logout-btn" onClick={handleLogout} aria-label="Logout" title="Logout"><LogOut size={22} /></button>
        </div>
      </div>

      <div className="user-dashboard-content">
        <div className="user-welcome">
          <h1>Discover Restaurants</h1>
          <p>Find your favorite restaurants and explore their menus</p>
          <div className="user-search-bar">
            <input
              type="text"
              placeholder="Search restaurants by name, cuisine, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading restaurants...</div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="empty-state"><p>No restaurants found.</p></div>
        ) : (
          <div className="restaurant-grid">
            {filteredRestaurants.map(restaurant => (
              <div key={restaurant._id} className="restaurant-card" onClick={() => handleViewMenu(restaurant)}>
                <div className="restaurant-card-img-wrap">
                  {restaurant.logo ? (
                    <img src={restaurant.logo} alt={restaurant.restaurantName} className="restaurant-card-img" />
                  ) : (
                    <div className="restaurant-card-no-img">No Image</div>
                  )}
                </div>
                <div className="restaurant-card-body">
                  <h3>{restaurant.restaurantName || 'Unnamed Restaurant'}</h3>
                  {restaurant.cuisineType && <span className="restaurant-card-cuisine">{restaurant.cuisineType}</span>}
                  {restaurant.location && <p className="restaurant-card-location">Location: {restaurant.location}</p>}
                  <div className="restaurant-card-meta">
                    {restaurant.openingTime && restaurant.closingTime && (
                      <span>Hours: {restaurant.openingTime} - {restaurant.closingTime}</span>
                    )}
                    {restaurant.serviceType && <span>Service: {restaurant.serviceType}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;

