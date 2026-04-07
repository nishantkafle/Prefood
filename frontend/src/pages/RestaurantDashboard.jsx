import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, ChefHat, MenuSquare, ClipboardList, MessagesSquare, Settings, LogOut, Download } from 'lucide-react';
import OrderManagement from './OrderManagement';
import KitchenHome from './KitchenHome';
import KitchenQueue from './KitchenQueue';
import RestaurantSettings from './RestaurantSettings';
import NotificationBell from '../components/NotificationBell';
import './Dashboard.css';

function RestaurantDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prepTime: '',
    category: 'veg',
    price: '',
    image: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    fetchMenuItems();
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile', { withCredentials: true });
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/menu/all', { withCredentials: true });
      if (response.data.success) {
        setMenuItems(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData({ ...formData, image: base64String });
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        // Update existing item
        const response = await axios.put(
          `/api/menu/${editingItem._id}`,
          formData,
          { withCredentials: true }
        );
        if (response.data.success) {
          alert('Menu item updated successfully!');
          resetForm();
          fetchMenuItems();
        }
      } else {
        // Add new item
        const response = await axios.post(
          '/api/menu/add',
          formData,
          { withCredentials: true }
        );
        if (response.data.success) {
          alert('Menu item added successfully!');
          resetForm();
          fetchMenuItems();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prepTime: '',
      category: 'veg',
      price: '',
      image: ''
    });
    setImagePreview('');
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      prepTime: item.prepTime,
      category: item.category,
      price: item.price,
      image: item.image
    });
    setImagePreview(item.image);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        const response = await axios.delete(
          `/api/menu/${id}`,
          { withCredentials: true }
        );
        if (response.data.success) {
          alert('Menu item deleted successfully!');
          fetchMenuItems();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Something went wrong');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('authToken');
      navigate('/login');
    }
  };

  const menuMetrics = useMemo(() => {
    const totalItems = menuItems.length;
    const vegItems = menuItems.filter((item) => item.category === 'veg').length;
    const nonVegItems = menuItems.filter((item) => item.category === 'non-veg').length;
    const veganItems = menuItems.filter((item) => item.category === 'vegan').length;

    return {
      totalItems,
      vegItems,
      nonVegItems,
      veganItems
    };
  }, [menuItems]);

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-brand">
          {profile?.logo ? (
            <img src={profile.logo} alt="Logo" className="header-logo-img" />
          ) : (
            <div className="header-logo-placeholder">Logo</div>
          )}
          <span className="logo">HotStop</span>
        </div>
        <div className="header-right">
          <div className="date-time">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <NotificationBell />
          <button type="button" className="install-btn install-app-btn" aria-label="Install App" title="Install App">
            <Download size={20} />
            <span>Install App</span>
          </button>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="sidebar">
          <div className="sidebar-top">
            <div className={`sidebar-item ${activeSection === 'home' ? 'active' : ''}`} onClick={() => setActiveSection('home')}>
              <BarChart3 size={18} />
              Kitchen Analytics
            </div>
            <div className={`sidebar-item ${activeSection === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveSection('kitchen')}>
              <ChefHat size={18} />
              Kitchen Queue
            </div>
            <div className={`sidebar-item ${activeSection === 'menu' ? 'active' : ''}`} onClick={() => setActiveSection('menu')}>
              <MenuSquare size={18} />
              Menu Management
            </div>
            <div className={`sidebar-item ${activeSection === 'orders' ? 'active' : ''}`} onClick={() => setActiveSection('orders')}>
              <ClipboardList size={18} />
              Orders Management
            </div>
            <div className="sidebar-item" onClick={() => navigate('/restaurant/messages')}>
              <MessagesSquare size={18} />
              Messages
            </div>
          </div>

          <div className="sidebar-bottom" ref={profileMenuRef}>
            <button
              className="profile-trigger"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              type="button"
            >
              {profile?.logo ? (
                <img src={profile.logo} alt="Profile" className="profile-trigger-image" />
              ) : (
                <div className="profile-trigger-fallback">
                  {(profile?.restaurantName || 'R').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="profile-trigger-name">{profile?.restaurantName || 'Restaurant Profile'}</span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <button
                  className="profile-dropdown-item"
                  onClick={() => {
                    setActiveSection('settings');
                    setShowProfileMenu(false);
                  }}
                  type="button"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  className="profile-dropdown-item logout"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          {activeSection === 'home' ? (
            <KitchenHome />
          ) : activeSection === 'kitchen' ? (
            <KitchenQueue />
          ) : activeSection === 'menu' ? (
            <div className="menu-analytics-shell">
              <div className="content-header menu-content-header">
                <div>
                  <div className="breadcrumb">Home / Menu Management</div>
                  <h1>Menu Performance</h1>
                  <p className="subtitle">Track your menu like a dashboard and manage offerings faster</p>
                </div>
                <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                  + Add New Item
                </button>
              </div>

              <div className="menu-kpi-grid">
                <div className="menu-kpi-card">
                  <div className="menu-kpi-title">TOTAL ITEMS</div>
                  <div className="menu-kpi-value">{menuMetrics.totalItems}</div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-title">TOTAL VEG</div>
                  <div className="menu-kpi-value">{menuMetrics.vegItems}</div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-title">TOTAL NON-VEG</div>
                  <div className="menu-kpi-value">{menuMetrics.nonVegItems}</div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-title">TOTAL VEGAN</div>
                  <div className="menu-kpi-value">{menuMetrics.veganItems}</div>
                </div>
              </div>

              {showForm && (
                <div className="form-modal">
                  <div className="form-container">
                    <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                    <form onSubmit={handleSubmit}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Food Name *</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Classic Cheeseburger"
                          />
                        </div>
                        <div className="form-group">
                          <label>Category *</label>
                          <select name="category" value={formData.category} onChange={handleChange} required>
                            <option value="veg">Veg</option>
                            <option value="non-veg">Non-Veg</option>
                            <option value="vegan">Vegan</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Description *</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          required
                          rows="3"
                          placeholder="Describe your food item..."
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Preparation Time (minutes) *</label>
                          <input
                            type="number"
                            name="prepTime"
                            value={formData.prepTime}
                            onChange={handleChange}
                            required
                            min="1"
                            placeholder="e.g., 15"
                          />
                        </div>
                        <div className="form-group">
                          <label>Price (NPR) *</label>
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            step="0.01"
                            placeholder="e.g., 350"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Food Photo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        {imagePreview && (
                          <div className="image-preview">
                            <img src={imagePreview} alt="Preview" />
                          </div>
                        )}
                      </div>

                      <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={resetForm}>
                          Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                          {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="menu-items-list">
                <div className="menu-items-headline">
                  <h3>All Menu Items</h3>
                  <span className="menu-items-count">{menuItems.length} items</span>
                </div>
                {loading && !menuItems.length ? (
                  <div className="loading">Loading menu items...</div>
                ) : menuItems.length === 0 ? (
                  <div className="empty-state">
                    <p>No menu items yet. Click "Add New Item" to get started!</p>
                  </div>
                ) : (
                  <div className="menu-items-grid">
                    {menuItems.map((item) => (
                      <div key={item._id} className="menu-item-card">
                        <div className="menu-item-image">
                          {item.image ? (
                            <img src={item.image} alt={item.name} />
                          ) : (
                            <div className="placeholder-image">No Image</div>
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
                            <span className="metric-pill">NPR {item.price}</span>
                            <span className="metric-pill">{item.prepTime} min prep</span>
                          </div>
                          <div className="menu-item-actions">
                            <button className="edit-btn" onClick={() => handleEdit(item)}>
                              Edit
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(item._id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === 'orders' ? (
            <OrderManagement />
          ) : activeSection === 'settings' ? (
            <RestaurantSettings profile={profile} onUpdate={fetchProfile} />
          ) : null}
        </div>
      </div>

    </div>
  );
}

export default RestaurantDashboard;

