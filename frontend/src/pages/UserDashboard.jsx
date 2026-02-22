import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:4000/api/auth/restaurants', { withCredentials: true });
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
    setActiveFilters(['all']);
    setOrderSuccess(false);
    try {
      const response = await axios.get(`http://localhost:4000/api/auth/restaurant/${restaurant._id}/menu`, { withCredentials: true });
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
    setActiveFilters(['all']);
    setOrderSuccess(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:4000/api/auth/logout', {}, { withCredentials: true });
      navigate('/user/login');
    } catch (err) {
      console.error('Logout error:', err);
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
  };

  const handlePlacePreOrder = async () => {
    if (cart.length === 0 || !selectedRestaurant?._id) return;
    try {
      const response = await axios.post('http://localhost:4000/api/orders/preorder', {
        restaurantId: selectedRestaurant._id,
        items: cart.map(i => ({ menuItem: i._id, quantity: i.quantity }))
      }, { withCredentials: true });

      if (response.data.success) {
        setOrderSuccess(true);
        setCart([]);
        setTimeout(() => setOrderSuccess(false), 3000);
      } else {
        alert(response.data.message || 'Failed to place preorder');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place preorder');
    }
  };

  const handleTrackOrderStatus = () => {
    navigate('/user/orders');
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
      <div className="dashboard-container">
        <div className="header">
          <div className="logo">HotStop</div>
          <div className="header-right">
            <button className="install-btn" onClick={handleTrackOrderStatus}>Track Order Status</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="um-page">
          {/* Hero Banner */}
          <div className="um-hero" style={selectedRestaurant.logo ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${selectedRestaurant.logo})` } : {}}>
            <button className="um-back-btn" onClick={handleBackToList}>Back</button>
            <div className="um-hero-content">
              <h1>{selectedRestaurant.restaurantName || 'Restaurant'}</h1>
              <div className="um-hero-meta">
                {selectedRestaurant.location && <span>Location: {selectedRestaurant.location}</span>}
                {selectedRestaurant.openingTime && selectedRestaurant.closingTime && (
                  <span>Open {selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}</span>
                )}
                {selectedRestaurant.phone && <span>Phone: {selectedRestaurant.phone}</span>}
              </div>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="um-body">
            {/* Left: Filter Sidebar */}
            <div className="um-filter-sidebar">
              <div className="um-filter-header">
                <span>Menu</span>
                <span className="um-filter-icon">Filter</span>
              </div>
              <div className="um-filter-list">
                <div
                  className={`um-filter-item ${activeFilters.includes('all') ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('all')}
                >
                  <span className="um-filter-label">All Items</span>
                  <span className="um-filter-dot" style={{ background: '#ff6600' }}></span>
                </div>
                <div
                  className={`um-filter-item ${activeFilters.includes('veg') ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('veg')}
                >
                  <span className="um-filter-label">Veg</span>
                  <span className="um-filter-dot" style={{ background: '#4caf50' }}></span>
                </div>
                <div
                  className={`um-filter-item ${activeFilters.includes('non-veg') ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('non-veg')}
                >
                  <span className="um-filter-label">Non-Veg</span>
                  <span className="um-filter-dot" style={{ background: '#f44336' }}></span>
                </div>
                <div
                  className={`um-filter-item ${activeFilters.includes('vegan') ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('vegan')}
                >
                  <span className="um-filter-label">Vegan</span>
                  <span className="um-filter-dot" style={{ background: '#8bc34a' }}></span>
                </div>
              </div>
            </div>

            {/* Center: Menu Grid */}
            <div className="um-menu-center">
              <div className="um-menu-topbar">
                <div>
                  <h2>Popular Items</h2>
                  <p className="um-menu-subtitle">{filteredMenu.length} items available</p>
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
                            <span className="um-food-category">{item.category === 'non-veg' ? 'Non-Veg' : item.category === 'veg' ? 'Veg' : 'Vegan'}</span>
                            <span>Prep: {item.prepTime} min</span>
                          </div>
                          <div className="um-food-bottom">
                            <span className="um-food-price">NPR {item.price}</span>
                            {qtyInCart === 0 ? (
                              <button className="um-add-btn" onClick={() => addToCart(item)}>Add +</button>
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

            {/* Right: Cart Panel */}
            <div className="um-cart-panel">
              <div className="um-cart-header">
                <div>
                  <span className="um-cart-title">Your Order</span>
                  <p className="um-cart-subtitle">Review and edit before placing order</p>
                </div>
                <div className="um-cart-header-actions">
                  <span className="um-cart-count">{getCartItemCount()} Items</span>
                  {cart.length > 0 && (
                    <button className="um-cart-clear" onClick={clearCart}>Clear</button>
                  )}
                </div>
              </div>

              {orderSuccess && (
                <div className="um-order-success">Pre-order placed successfully!</div>
              )}

              {cart.length === 0 && !orderSuccess ? (
                <div className="um-cart-empty">
                  <p>Your cart is empty</p>
                  <span>Add items from the menu</span>
                </div>
              ) : (
                <>
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

                  <div className="um-cart-footer">
                    <div className="um-cart-total-row">
                      <span>Total</span>
                      <span className="um-cart-total-amount">NPR {getCartTotal()}</span>
                    </div>
                    <button className="um-preorder-btn" onClick={handlePlacePreOrder} disabled={cart.length === 0}>
                      Place Dine-In Pre-Order
                    </button>
                  </div>
                </>
              )}
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
          <button className="install-btn" onClick={handleTrackOrderStatus}>Track Order Status</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
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
