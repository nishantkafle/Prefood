import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API = 'http://localhost:4000/api/auth';

// Small Modal
function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave}>Save Changes</button>
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
    <Modal title="Edit User" onClose={onClose} onSave={handleSave}>
      {err && <p className="modal-err">{err}</p>}
      <div className="form-group">
        <label>Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      {saving && <p className="saving-text">Saving...</p>}
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

  const field = (label, key) => (
    <div className="form-group" key={key}>
      <label>{label}</label>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
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
    <Modal title="Edit Restaurant" onClose={onClose} onSave={handleSave}>
      {err && <p className="modal-err">{err}</p>}
      {field('Owner Name', 'name')}
      {field('Email', 'email')}
      {field('Restaurant Name', 'restaurantName')}
      {field('Location', 'location')}
      {field('Phone', 'phone')}
      {field('Cuisine Type', 'cuisineType')}
      {field('Restaurant Type', 'restaurantType')}
      {field('Service Type', 'serviceType')}
      {field('Opening Time', 'openingTime')}
      {field('Closing Time', 'closingTime')}
      {saving && <p className="saving-text">Saving...</p>}
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
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }
  const [toast, setToast] = useState('');

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
        axios.get(`${API}/admin/restaurants`, { withCredentials: true }),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (restsRes.data.success) setRestaurants(restsRes.data.data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Verify admin access
    axios.get(`${API}/profile`, { withCredentials: true }).then((res) => {
      if (!res.data.success || res.data.data.role !== 'admin') {
        navigate('/admin/login');
      } else {
        fetchAll();
      }
    }).catch(() => navigate('/admin/login'));
  }, [navigate, fetchAll]);

  const handleLogout = async () => {
    await axios.post(`${API}/logout`, {}, { withCredentials: true });
    navigate('/');
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const url = type === 'user' ? `${API}/admin/user/${id}` : `${API}/admin/restaurant/${id}`;
    try {
      const res = await axios.delete(url, { withCredentials: true });
      if (res.data.success) {
        showToast(`${type === 'user' ? 'User' : 'Restaurant'} deleted successfully`);
        fetchAll();
      }
    } catch {
      showToast('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleRestaurantStatus = async (restaurantId, nextActiveStatus) => {
    try {
      const res = await axios.patch(
        `${API}/admin/restaurant/${restaurantId}/status`,
        { isActive: nextActiveStatus },
        { withCredentials: true }
      );

      if (res.data.success) {
        showToast(`Restaurant ${nextActiveStatus ? 'activated' : 'deactivated'} successfully`);
        fetchAll();
      } else {
        showToast(res.data.message || 'Status update failed');
      }
    } catch {
      showToast('Status update failed');
    }
  };

  return (
    <div className="admin-wrapper">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span>HotStop</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`nav-item ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            Restaurants
          </button>
        </nav>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <h1 className="topbar-title">
            {activeTab === 'overview' && 'Dashboard Overview'}
            {activeTab === 'users' && 'Manage Users'}
            {activeTab === 'restaurants' && 'Manage Restaurants'}
          </h1>
          <div className="topbar-badge">Admin</div>
        </header>

        {loading ? (
          <div className="admin-loading">Loading data...</div>
        ) : (
          <>
            {/* Overview Tab */}
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

                {/* Quick tables */}
                <div className="recent-section">
                  <h3>Recent Users</h3>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th></tr>
                    </thead>
                    <tbody>
                      {users.slice(0, 5).map((u) => (
                        <tr key={u._id}><td>{u.name}</td><td>{u.email}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="recent-section">
                  <h3>Recent Restaurants</h3>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Restaurant</th><th>Location</th></tr>
                    </thead>
                    <tbody>
                      {restaurants.slice(0, 5).map((r) => (
                        <tr key={r._id}><td>{r.restaurantName || r.name}</td><td>{r.location || '-'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="table-section">
                <div className="table-header-row">
                  <h2>All Users ({users.length})</h2>
                </div>
                <table className="admin-table full-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Verified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan="5" className="empty-row">No users found</td></tr>
                    )}
                    {users.map((u, idx) => (
                      <tr key={u._id}>
                        <td>{idx + 1}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.isAccountVerified ? 'badge-green' : 'badge-grey'}`}>
                            {u.isAccountVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="action-cell">
                          <button className="btn-edit" onClick={() => setEditUser(u)}>Edit</button>
                          <button className="btn-delete" onClick={() => setConfirmDelete({ type: 'user', id: u._id, name: u.name })}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Restaurants Tab */}
            {activeTab === 'restaurants' && (
              <div className="table-section">
                <div className="table-header-row">
                  <h2>All Restaurants ({restaurants.length})</h2>
                </div>
                <table className="admin-table full-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Restaurant Name</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Location</th>
                      <th>Phone</th>
                      <th>Cuisine</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.length === 0 && (
                      <tr><td colSpan="10" className="empty-row">No restaurants found</td></tr>
                    )}
                    {restaurants.map((r, idx) => (
                      <tr key={r._id}>
                        <td>{idx + 1}</td>
                        <td><strong>{r.restaurantName || '-'}</strong></td>
                        <td>{r.name}</td>
                        <td>{r.email}</td>
                        <td>{r.location || '-'}</td>
                        <td>{r.phone || '-'}</td>
                        <td>{r.cuisineType || '-'}</td>
                        <td>{r.openingTime && r.closingTime ? `${r.openingTime} - ${r.closingTime}` : '-'}</td>
                        <td>
                          <button
                            className={`status-toggle ${r.isActive === false ? 'inactive' : 'active'}`}
                            onClick={() => handleToggleRestaurantStatus(r._id, r.isActive === false)}
                          >
                            {r.isActive === false ? 'Inactive' : 'Active'}
                          </button>
                        </td>
                        <td className="action-cell">
                          <button className="btn-edit" onClick={() => setEditRestaurant(r)}>Edit</button>
                          <button className="btn-delete" onClick={() => setConfirmDelete({ type: 'restaurant', id: r._id, name: r.restaurantName || r.name })}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && <div className="admin-toast">{toast}</div>}

      {/* Edit Modals */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchAll(); showToast('User updated successfully'); }}
        />
      )}
      {editRestaurant && (
        <EditRestaurantModal
          restaurant={editRestaurant}
          onClose={() => setEditRestaurant(null)}
          onSaved={() => { setEditRestaurant(null); fetchAll(); showToast('Restaurant updated successfully'); }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-delete-confirm" onClick={handleDeleteConfirmed}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
