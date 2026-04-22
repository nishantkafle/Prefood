import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, ChefHat, MenuSquare, Layers, ClipboardList, MessagesSquare, Settings, LogOut, Pencil, Trash2, Clock, Info, X, Coffee } from 'lucide-react';
import { createAppSocket } from '../../config/socket';
import OrderManagement from './OrderManagement';
import KitchenHome from './KitchenHome';
import KitchenQueue from './KitchenQueue';
import RestaurantSettings from './RestaurantSettings';
import NotificationBell from '../../components/shared/NotificationBell';

import DashboardNavbar from '../../components/shared/DashboardNavbar';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import '../shared/Dashboard.css';

const ITEMS_PER_PAGE = 5;

function RestaurantDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const socketRef = useRef(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchMenuItems();
    fetchProfile();
  }, []);

  useEffect(() => {
    const requestedSection = location.state?.section;
    const allowedSections = ['home', 'kitchen', 'menu', 'orders', 'settings'];
    if (allowedSections.includes(requestedSection)) {
      setActiveSection(requestedSection);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!profile?._id) return undefined;

    socketRef.current = createAppSocket();

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinRestaurantMenu', profile._id);
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
    });

    socketRef.current.on('menu:itemDeleted', ({ _id }) => {
      setMenuItems((prev) => prev.filter((menuItem) => menuItem._id !== _id));
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveRestaurantMenu', profile._id);
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [profile?._id]);

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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      try {
        setLoading(true);
        const imageUrl = await uploadImageToCloudinary(file);
        setFormData({ ...formData, image: imageUrl });
        setImagePreview(imageUrl);
      } catch (err) {
        alert(err.message || 'Failed to upload photo');
      } finally {
        setLoading(false);
      }
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
        const response = await axios.put(
          `/api/menu/${editingItem._id}`,
          formData,
          { withCredentials: true }
        );
        if (response.data.success) {
          resetForm();
          fetchMenuItems();
        }
      } else {
        const response = await axios.post(
          '/api/menu/add',
          formData,
          { withCredentials: true }
        );
        if (response.data.success) {
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

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    try {
      const response = await axios.delete(
        `/api/menu/${itemToDelete._id}`,
        { withCredentials: true }
      );
      if (response.data.success) {
        fetchMenuItems();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleItemStatus = async (item) => {
    try {
      const response = await axios.patch(
        `/api/menu/${item._id}/status`,
        { isActive: !item.isActive },
        { withCredentials: true }
      );

      if (response.data.success) {
        setMenuItems((prev) =>
          prev.map((menuItem) =>
            menuItem._id === item._id ? { ...menuItem, isActive: !item.isActive } : menuItem
          )
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('authToken');
      navigate('/');
    }
  };

  const menuMetrics = useMemo(() => {
    const totalItems = menuItems.length;
    const vegItems = menuItems.filter((item) => item.category === 'veg').length;
    const nonVegItems = menuItems.filter((item) => item.category === 'non-veg').length;
    const veganItems = menuItems.filter((item) => item.category === 'vegan').length;

    return { totalItems, vegItems, nonVegItems, veganItems };
  }, [menuItems]);


  return (
    <div className="dashboard-container">
      <DashboardNavbar
        logoImage={profile?.logo}
        showLogoPlaceholder
        showDateTime
        rightContent={(
          <>
            <NotificationBell />
          </>
        )}
      />

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
            <div className="rk-menu-shell">
              <div className="rk-content-header">
                <div className="rk-header-text">
                  <div className="rk-breadcrumb">Management / Menu System</div>
                  <h1>Menu Performance</h1>
                  <p>Monitor your offerings and manage dish availability in real-time.</p>
                </div>
                <button className="rk-add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                  <MenuSquare size={18} />
                  Add New Item
                </button>
              </div>

              <div className="rk-kpi-grid">
                <div className="rk-kpi-card">
                  <div className="rk-kpi-icon total"><Layers size={20} /></div>
                  <div className="rk-kpi-info">
                    <span className="rk-kpi-label">Total Items</span>
                    <span className="rk-kpi-value">{menuMetrics.totalItems}</span>
                  </div>
                </div>
                <div className="rk-kpi-card">
                  <div className="rk-kpi-icon veg"><ChefHat size={20} /></div>
                  <div className="rk-kpi-info">
                    <span className="rk-kpi-label">Veg Items</span>
                    <span className="rk-kpi-value">{menuMetrics.vegItems}</span>
                  </div>
                </div>
                <div className="rk-kpi-card">
                  <div className="rk-kpi-icon non-veg"><BarChart3 size={20} /></div>
                  <div className="rk-kpi-info">
                    <span className="rk-kpi-label">Non-Veg</span>
                    <span className="rk-kpi-value">{menuMetrics.nonVegItems}</span>
                  </div>
                </div>
                <div className="rk-kpi-card">
                  <div className="rk-kpi-icon vegan"><Settings size={20} /></div>
                  <div className="rk-kpi-info">
                    <span className="rk-kpi-label">Vegan</span>
                    <span className="rk-kpi-value">{menuMetrics.veganItems}</span>
                  </div>
                </div>
              </div>

              {showForm && (
                <div className="rk-modal-overlay" onClick={resetForm}>
                  <div className="rk-form-modal premium-rk-modal" onClick={e => e.stopPropagation()}>
                    <div className="rk-modal-header">
                      <div className="header-text">
                        <h2>{editingItem ? 'Edit Dish Profile' : 'New Dish Architecture'}</h2>
                        <p>Configure your menu items with precise details and high-quality imagery.</p>
                      </div>
                      <button className="rk-modal-close" onClick={resetForm}><X size={20} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="rk-form">
                      <div className="rk-form-grid">
                        <div className="rk-form-group">
                          <label>Dish Name</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Signature Pasta"
                          />
                        </div>
                        <div className="rk-form-group">
                          <label>Category</label>
                          <select name="category" value={formData.category} onChange={handleChange} required>
                            <option value="veg">Vegetarian</option>
                            <option value="non-veg">Non-Vegetarian</option>
                            <option value="vegan">Vegan</option>
                          </select>
                        </div>
                        
                        <div className="rk-form-group rk-span-2">
                          <label>Description</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="3"
                            placeholder="Describe the ingredients and preparation..."
                          />
                        </div>

                        <div className="rk-form-group">
                          <label>Preparation Time (mins)</label>
                          <input
                            type="number"
                            name="prepTime"
                            value={formData.prepTime}
                            onChange={handleChange}
                            required
                            min="1"
                          />
                        </div>
                        <div className="rk-form-group">
                          <label>Price (NPR)</label>
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="rk-form-group rk-span-2">
                          <label>Visual Identity (Image)</label>
                          <div className="rk-premium-upload-box">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              id="dish-image-input"
                              hidden
                            />
                            <label htmlFor="dish-image-input" className="rk-image-label">
                              {imagePreview ? (
                                <div className="preview-container">
                                  <img src={imagePreview} alt="Preview" className="rk-image-preview" />
                                  <div className="change-overlay">Replace Visual</div>
                                </div>
                              ) : (
                                <div className="rk-upload-placeholder">
                                  <div className="pulse-icon">+</div>
                                  <span>Establish Dish Imagery</span>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="rk-form-actions">
                        <button type="button" className="rk-btn-secondary" onClick={resetForm}>Discard</button>
                        <button type="submit" className="rk-btn-primary premium-submit" disabled={loading}>
                          {loading ? <div className="spinner-small"></div> : editingItem ? 'Update Dish' : 'Publish Dish'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="rk-items-section">
                <div className="rk-section-title">
                  <div className="rk-title-with-icon">
                    <Layers size={20} />
                    <h3>Active Menu</h3>
                  </div>
                  <span className="rk-title-badge">{menuItems.length} Dishes Total</span>
                </div>

                {loading && !menuItems.length ? (
                  <div className="rk-loading-state">
                    <div className="rk-loader"></div>
                    <p>Fetching your menu...</p>
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="rk-empty-state">
                    <ChefHat size={48} />
                    <p>Your menu is empty. Start adding delicious items!</p>
                  </div>
                ) : (
                  <>
                    <div className="rk-items-grid">
                      {menuItems.map((item) => (
                        <div key={item._id} className={`rk-item-card ${item.isActive ? 'active' : 'inactive'}`}>
                          <div className="rk-item-media">
                            {item.image ? (
                              <img src={item.image} alt={item.name} />
                            ) : (
                              <div className="rk-media-placeholder">No Image</div>
                            )}
                            <div className={`rk-status-tag ${item.isActive ? 'active' : 'inactive'}`}>
                              {item.isActive ? 'Live' : 'Hidden'}
                            </div>
                          </div>

                          <div className="rk-item-content">
                            <div className="rk-item-header">
                              <div>
                                <h4>{item.name}</h4>
                                <span className={`rk-cat-label ${item.category}`}>{item.category}</span>
                              </div>
                              <span className="rk-item-price">NPR {item.price}</span>
                            </div>
                            
                            <p className="rk-item-desc">{item.description}</p>
                            
                            <div className="rk-item-meta">
                              <span className="rk-meta-item"><Clock size={14} /> {item.prepTime} mins</span>
                              <span className="rk-meta-item"><Info size={14} /> {item.isActive ? 'Visible to customers' : 'Hidden from menu'}</span>
                            </div>

                            <div className="rk-item-actions">
                              <button 
                                className={`rk-action-toggle ${item.isActive ? 'on' : 'off'}`}
                                onClick={() => handleToggleItemStatus(item)}
                                title={item.isActive ? 'Disable' : 'Enable'}
                              >
                                {item.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <div className="rk-action-group">
                                <button className="rk-mini-action edit" onClick={() => handleEdit(item)} title="Edit Item">
                                  <Pencil size={18} />
                                </button>
                                <button className="rk-mini-action delete" onClick={() => setItemToDelete(item)} title="Delete Item">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
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

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Remove Menu Item"
        message={`Are you sure you want to remove "${itemToDelete?.name}"? Customers will no longer be able to order this dish.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setItemToDelete(null)}
        confirmText="Yes, Delete Dish"
      />
    </div>
  );
}

export default RestaurantDashboard;

