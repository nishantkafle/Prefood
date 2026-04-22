import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Trash2, ShieldCheck, Mail, User, MapPin, Phone, Coffee, Clock, Star, Power, X } from 'lucide-react';
import { createAppSocket } from '../../config/socket';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/shared/ConfirmModal';
import './AdminDashboard.css';

const API = '/api/auth';
const ITEMS_PER_PAGE = 5;

// Premium Modal Component
function Modal({ title, onClose, onSave, children, saving }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box premium-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>{title}</h3>
            <div className="modal-subtitle">Update information and save changes</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body custom-scrollbar">{children}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save premium-save-btn" onClick={onSave} disabled={saving}>
            {saving ? <div className="spinner"></div> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit User Modal
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await axios.put(`${API}/admin/user/${user._id}`, form, { withCredentials: true });
      if (res.data.success) {
        onSaved();
      } else {
        setErr(res.data.message);
      }
    } catch {
      setErr('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit User Account" onClose={onClose} onSave={handleSave} saving={saving}>
      {err && <div className="modal-err-box"><div className="err-icon">!</div>{err}</div>}
      <div className="premium-form-grid">
        <div className="form-group floating-label">
          <label>Full Name</label>
          <div className="input-with-icon">
            <User size={18} />
            <input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="Enter user's full name"
            />
          </div>
        </div>
        <div className="form-group floating-label">
          <label>Email Address</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              placeholder="e.g. user@example.com"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Edit Restaurant Modal
function EditRestaurantModal({ restaurant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: restaurant.name || '',
    email: restaurant.email || '',
    restaurantName: restaurant.restaurantName || '',
    location: restaurant.location || '',
    phone: restaurant.phone || '',
    cuisineType: restaurant.cuisineType || '',
    restaurantType: restaurant.restaurantType || '',
    serviceType: restaurant.serviceType || '',
    openingTime: restaurant.openingTime || '',
    closingTime: restaurant.closingTime || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const field = (label, key, icon) => (
    <div className="form-group premium-field" key={key}>
      <label>{label}</label>
      <div className="input-with-icon">
        {icon}
        <input 
          value={form[key]} 
          onChange={(e) => setForm({ ...form, [key]: e.target.value })} 
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await axios.put(`${API}/admin/restaurant/${restaurant._id}`, form, { withCredentials: true });
      if (res.data.success) {
        onSaved();
      } else {
        setErr(res.data.message);
      }
    } catch {
      setErr('Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Restaurant Profile" onClose={onClose} onSave={handleSave} saving={saving}>
      {err && <div className="modal-err-box"><div className="err-icon">!</div>{err}</div>}
      <div className="premium-form-grid res-edit-grid">
        {field('Owner Name', 'name', <User size={18} />)}
        {field('Email', 'email', <Mail size={18} />)}
        {field('Restaurant Name', 'restaurantName', <Coffee size={18} />)}
        {field('Location', 'location', <MapPin size={18} />)}
        {field('Phone', 'phone', <Phone size={18} />)}
        {field('Cuisine Type', 'cuisineType', <Coffee size={18} />)}
        <div className="form-row-2">
          {field('Restaurant Type', 'restaurantType', <Coffee size={18} />)}
          {field('Service Type', 'serviceType', <Coffee size={18} />)}
        </div>
        <div className="form-row-2">
          {field('Opening Time', 'openingTime', <Clock size={18} />)}
          {field('Closing Time', 'closingTime', <Clock size={18} />)}
        </div>
      </div>
    </Modal>
  );
}

// Main Dashboard
function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, totalRestaurants: 0 });
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editRestaurant, setEditRestaurant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [toast, setToast] = useState('');
  const [socketReady, setSocketReady] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const socketRef = React.useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, restsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/users`, { withCredentials: true }),
        axios.get(`${API}/admin/restaurants`, { withCredentials: true })
      ]);
      if (statsRes.data?.success) setStats(statsRes.data.data || { totalUsers: 0, totalRestaurants: 0 });
      if (usersRes.data?.success) setUsers(usersRes.data.data || []);
      if (restsRes.data?.success) setRestaurants(restsRes.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertRestaurant = useCallback((updatedRestaurant) => {
    if (!updatedRestaurant?._id) return;

    setRestaurants((prev) => {
      const exists = prev.some((restaurant) => String(restaurant._id) === String(updatedRestaurant._id));
      if (!exists) {
        return [updatedRestaurant, ...prev];
      }

      return prev.map((restaurant) => (
        String(restaurant._id) === String(updatedRestaurant._id)
          ? { ...restaurant, ...updatedRestaurant }
          : restaurant
      ));
    });
  }, []);

  const removeRestaurant = useCallback((restaurantId) => {
    if (!restaurantId) return;
    setRestaurants((prev) => prev.filter((restaurant) => String(restaurant._id) !== String(restaurantId)));
  }, []);

  useEffect(() => {
    axios.get(`${API}/profile`, { withCredentials: true }).then((res) => {
      if (!res.data.success || res.data.data.role !== 'admin') {
        navigate('/');
      } else {
        fetchAll();
      }
    }).catch(() => navigate('/'));
  }, [navigate, fetchAll]);

  useEffect(() => {
    socketRef.current = createAppSocket();

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinAdmin');
      setSocketReady(true);
    });

    socketRef.current.on('restaurant:updated', (payload) => {
      if (payload?.restaurant) {
        upsertRestaurant(payload.restaurant);
      }
    });

    socketRef.current.on('restaurant:statusChanged', (payload) => {
      if (payload?.restaurant) {
        upsertRestaurant(payload.restaurant);
      }
    });

    socketRef.current.on('restaurant:deleted', ({ restaurantId }) => {
      removeRestaurant(restaurantId);
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveAdmin');
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [removeRestaurant, upsertRestaurant]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/logout`, {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/');
    } catch {
      localStorage.removeItem('authToken');
      navigate('/');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const url = type === 'user' ? `${API}/admin/user/${id}` : `${API}/admin/restaurant/${id}`;
    try {
      const res = await axios.delete(url, { withCredentials: true });
      if (res.data.success) {
        showToast(`${type === 'user' ? 'User' : 'Restaurant'} deleted successfully`);
        if (type === 'restaurant') {
          removeRestaurant(id);
        } else {
          fetchAll();
        }
      }
    } catch {
      showToast('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleRestaurantStatus = async (restaurantId, nextActiveStatus) => {
    try {
      setRestaurants((prev) => prev.map((restaurant) => (
        String(restaurant._id) === String(restaurantId)
          ? { ...restaurant, isActive: nextActiveStatus }
          : restaurant
      )));

      const res = await axios.patch(
        `${API}/admin/restaurant/${restaurantId}/status`,
        { isActive: nextActiveStatus },
        { withCredentials: true }
      );

      if (res.data.success) {
        showToast(`Restaurant ${nextActiveStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        fetchAll();
        showToast(res.data.message || 'Status update failed');
      }
    } catch {
      fetchAll();
      showToast('Status update failed');
    }
  };

  const handleToggleRestaurantFeatured = async (restaurantId, nextFeaturedStatus) => {
    try {
      setRestaurants((prev) => prev.map((restaurant) => (
        String(restaurant._id) === String(restaurantId)
          ? { ...restaurant, isFeaturedHome: nextFeaturedStatus }
          : restaurant
      )));

      const res = await axios.patch(
        `${API}/admin/restaurant/${restaurantId}/featured`,
        { isFeaturedHome: nextFeaturedStatus },
        { withCredentials: true }
      );

      if (res.data.success) {
        showToast(nextFeaturedStatus ? 'Restaurant featured on homepage' : 'Restaurant removed from homepage');
      } else {
        fetchAll();
        showToast(res.data.message || 'Featured update failed');
      }
    } catch {
      fetchAll();
      showToast('Featured update failed');
    }
  };

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * ITEMS_PER_PAGE;
    return users.slice(start, start + ITEMS_PER_PAGE);
  }, [users, userPage]);

  const paginatedRestaurants = useMemo(() => {
    const start = (restaurantPage - 1) * ITEMS_PER_PAGE;
    return restaurants.slice(start, start + ITEMS_PER_PAGE);
  }, [restaurants, restaurantPage]);

  const featuredCount = (restaurants || []).filter((r) => !!r?.isFeaturedHome).length;

  const dashboardTitle = useMemo(() => {
    if (activeTab === 'overview') return 'Dashboard Overview';
    if (activeTab === 'users') return 'Manage Users';
    if (activeTab === 'restaurants') return 'Manage Restaurants';
    return 'Admin Dashboard';
  }, [activeTab]);

  const restaurantTableSubtitle = socketReady ? 'Live restaurant sync enabled' : 'Connecting live updates...';

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      handleLogout={handleLogout}
      title={dashboardTitle}
    >
      {loading ? (
        <div className="admin-loading">
          <div className="spinner-large"></div>
          <p>Analyzing Platform Data...</p>
        </div>
      ) : (
        <div className="admin-content-fade">
          {activeTab === 'overview' && (
            <div className="overview-grid">
              <div className="stat-card stat-users">
                <div className="stat-info">
                  <div className="stat-number">{stats.totalUsers}</div>
                  <div className="stat-label">Registered Users</div>
                </div>
              </div>
              <div className="stat-card stat-restaurants">
                <div className="stat-info">
                  <div className="stat-number">{stats.totalRestaurants}</div>
                  <div className="stat-label">Registered Restaurants</div>
                </div>
              </div>
              <div className="stat-card stat-total">
                <div className="stat-info">
                  <div className="stat-number">{stats.totalUsers + stats.totalRestaurants}</div>
                  <div className="stat-label">Total Accounts</div>
                </div>
              </div>

              <div className="stat-card stat-featured">
                <div className="stat-info">
                  <div className="stat-number">{featuredCount}/7</div>
                  <div className="stat-label">Homepage Featured</div>
                </div>
              </div>

              <div className="recent-section">
                <h3>Recent Active Users</h3>
                <table className="admin-table">
                  <thead>
                    <tr><th>User Name</th></tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="recent-section">
                <h3>Recently Registered Restaurants</h3>
                <table className="admin-table">
                  <thead>
                    <tr><th>Restaurant</th><th>Join Date</th></tr>
                  </thead>
                  <tbody>
                    {restaurants.slice(0, 5).map((r) => (
                      <tr key={r._id}><td>{r.restaurantName || r.name}</td><td>{new Date(r.createdAt).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="table-section">
              <div className="table-header-row">
                <h2>All Verified Users <span className="entity-count">{users.length}</span></h2>
              </div>
              <div className="premium-table-card">
                <div className="table-responsive">
                  <table className="admin-table full-table users-table">
                    <thead>
                      <tr>
                        <th className="users-col-index">#</th>
                        <th>Account Name</th>
                        <th>Email Identity</th>
                        <th className="users-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.length === 0 && (
                        <tr><td colSpan="4" className="empty-row">No users detected on the platform</td></tr>
                      )}
                      {paginatedUsers.map((u, idx) => (
                        <tr key={u._id}>
                          <td className="users-col-index">{(userPage - 1) * 5 + idx + 1}</td>
                          <td>
                            <div className="admin-cell-user">
                              <span className="user-avatar-chip">
                                {(u.name || 'U').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                              <div className="user-name-stack">
                                <span className="user-primary-name">{u.name}</span>
                                <span className="user-secondary-id">ID: {String(u._id).slice(-6)}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="admin-cell-email">
                              <Mail size={16} />
                              <span className="user-email-text">{u.email}</span>
                            </div>
                          </td>

                          <td className="users-col-actions">
                            <div className="action-cell">
                              <button className="btn-icon-action btn-edit" title="Edit Profile" onClick={() => setEditUser(u)}>
                                <Pencil size={18} />
                              </button>
                              <button 
                                className="btn-icon-action btn-delete" 
                                title="Delete Account" 
                                onClick={() => setConfirmDelete({ type: 'user', id: u._id, name: u.name })}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={userPage}
                  totalItems={users.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setUserPage}
                />
              </div>
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="table-section">
              <div className="table-header-row">
                <div className="table-title-stack">
                  <h2>Restaurant Partners <span className="entity-count">{restaurants.length}</span></h2>
                  <p className="table-subtitle">{restaurantTableSubtitle}</p>
                </div>
              </div>
              <div className="premium-table-card">
                <div className="table-responsive">
                  <table className="admin-table full-table restaurant-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Brand Info</th>
                        <th>Communications</th>
                        <th>Logistics</th>
                        <th>Schedule</th>
                        <th>Status Toggles</th>
                        <th>Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRestaurants.length === 0 && (
                        <tr><td colSpan="7" className="empty-row">No restaurant partners found</td></tr>
                      )}
                      {paginatedRestaurants.map((r, idx) => (
                        <tr key={r._id}>
                          <td>{(restaurantPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                          <td>
                            <div className="res-info-cell">
                              <div className="res-main-info">
                                <Coffee size={16} />
                                <strong>{r.restaurantName || '-'}</strong>
                              </div>
                              <span className="res-owner-name">Owner: {r.name}</span>
                            </div>
                          </td>
                          <td>
                            <div className="res-contact-cell">
                              <span className="res-contact-item"><Mail size={14} />{r.email}</span>
                              <span className="res-contact-item"><Phone size={14} />{r.phone || '-'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="res-details-cell">
                              <span className="res-detail-item"><MapPin size={14} />{r.location || '-'}</span>
                              <span className="res-detail-item">Cuisine: {r.cuisineType || '-'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="hours-badge">
                              <Clock size={12} />
                              {r.openingTime && r.closingTime ? `${r.openingTime} - ${r.closingTime}` : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="premium-toggle-group">
                              <button
                                className={`premium-toggle-btn featured ${r.isFeaturedHome ? 'on' : 'off'}`}
                                onClick={() => handleToggleRestaurantFeatured(r._id, !r.isFeaturedHome)}
                                title={r.isFeaturedHome ? 'Remove from Homepage' : 'Feature on Homepage'}
                              >
                                <Star size={14} fill={r.isFeaturedHome ? "currentColor" : "none"} />
                                <span>{r.isFeaturedHome ? 'Featured' : 'Regular'}</span>
                              </button>
                              <button
                                className={`premium-toggle-btn active ${r.isActive !== false ? 'on' : 'off'}`}
                                onClick={() => handleToggleRestaurantStatus(r._id, r.isActive === false)}
                                title={r.isActive !== false ? 'Deactivate Restaurant' : 'Activate Restaurant'}
                              >
                                <Power size={14} />
                                <span>{r.isActive !== false ? 'Active' : 'Offline'}</span>
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="action-cell">
                              <button className="btn-icon-action btn-edit" title="Edit Profile" onClick={() => setEditRestaurant(r)}>
                                <Pencil size={18} />
                              </button>
                              <button 
                                className="btn-icon-action btn-delete" 
                                title="Remove Partner" 
                                onClick={() => setConfirmDelete({ 
                                  type: 'restaurant', 
                                  id: r._id, 
                                  name: r.restaurantName || r.name 
                                })}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={restaurantPage}
                  totalItems={restaurants.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setRestaurantPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {toast && <div className="admin-toast">{toast}</div>}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchAll(); showToast('Intelligence updated: User sync complete'); }}
        />
      )}
      {editRestaurant && (
        <EditRestaurantModal
          restaurant={editRestaurant}
          onClose={() => setEditRestaurant(null)}
          onSaved={() => { setEditRestaurant(null); fetchAll(); showToast('Intelligence updated: Restaurant sync complete'); }}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Terminal Account Deletion"
        message={`Warning: You are about to permanently purge "${confirmDelete?.name}" from the system. This action is terminal and cannot be reversed.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Confirm Purge"
      />
    </AdminLayout>
  );
}

export default AdminDashboard;

