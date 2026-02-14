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

  const filteredRestaurants = restaurants.filter(r => {
    const q = searchQuery.toLowerCase();
    return (r.restaurantName || '').toLowerCase().includes(q) ||
           (r.cuisineType || '').toLowerCase().includes(q) ||
           (r.location || '').toLowerCase().includes(q);
  });

  // Menu view for a selected restaurant
  if (selectedRestaurant) {
    return (
      <div className="dashboard-container">
        <div className="header">
          <div className="logo">HotStop</div>
          <div className="header-right">
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="user-menu-view">
          <button className="back-btn" onClick={handleBackToList}>← Back to Restaurants</button>

          <div className="restaurant-hero">
            {selectedRestaurant.logo ? (
              <img src={selectedRestaurant.logo} alt="Logo" className="restaurant-hero-logo" />
            ) : (
              <div className="restaurant-hero-placeholder">🍽️</div>
            )}
            <div className="restaurant-hero-info">
              <h1>{selectedRestaurant.restaurantName || 'Restaurant'}</h1>
              {selectedRestaurant.cuisineType && <span className="hero-cuisine">{selectedRestaurant.cuisineType}</span>}
              {selectedRestaurant.location && <p className="hero-location">📍 {selectedRestaurant.location}</p>}
              <div className="hero-meta">
                {selectedRestaurant.openingTime && selectedRestaurant.closingTime && (
                  <span>🕐 {selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}</span>
                )}
                {selectedRestaurant.serviceType && <span>🍴 {selectedRestaurant.serviceType}</span>}
                {selectedRestaurant.phone && <span>📞 {selectedRestaurant.phone}</span>}
              </div>
            </div>
          </div>

          <div className="content-header" style={{ marginTop: 0 }}>
            <div>
              <h1>Menu</h1>
              <p className="subtitle">{menuItems.length} items available</p>
            </div>
          </div>

          {menuLoading ? (
            <div className="loading">Loading menu...</div>
          ) : menuItems.length === 0 ? (
            <div className="empty-state"><p>No menu items available yet.</p></div>
          ) : (
            <div className="menu-items-grid">
              {menuItems.map(item => (
                <div key={item._id} className="menu-item-card">
                  <div className="menu-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="placeholder-image">📷</div>
                    )}
                  </div>
                  <div className="menu-item-details">
                    <div className="menu-item-header">
                      <h3>{item.name}</h3>
                      <span className={`category-badge ${item.category}`}>
                        {item.category === 'veg' ? 'Veg' : item.category === 'non-veg' ? 'Non-Veg' : 'Vegan'}
                      </span>
                    </div>
                    <p className="menu-item-description">{item.description}</p>
                    <div className="menu-item-info">
                      <span>💰 NPR {item.price}</span>
                      <span>⏱️ {item.prepTime} min</span>
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

  // Restaurant listing view
  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right">
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
                    <div className="restaurant-card-no-img">🍽️</div>
                  )}
                </div>
                <div className="restaurant-card-body">
                  <h3>{restaurant.restaurantName || 'Unnamed Restaurant'}</h3>
                  {restaurant.cuisineType && <span className="restaurant-card-cuisine">{restaurant.cuisineType}</span>}
                  {restaurant.location && <p className="restaurant-card-location">📍 {restaurant.location}</p>}
                  <div className="restaurant-card-meta">
                    {restaurant.openingTime && restaurant.closingTime && (
                      <span>🕐 {restaurant.openingTime} - {restaurant.closingTime}</span>
                    )}
                    {restaurant.serviceType && <span>🍴 {restaurant.serviceType}</span>}
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
