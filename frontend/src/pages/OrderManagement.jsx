import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function OrderManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ongoing');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    items: []
  });

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/all', { withCredentials: true });
      if (response.data.success) {
        const today = new Date();
        const todayStr = today.toDateString();
        const todayOrders = response.data.data.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.toDateString() === todayStr;
        });
        setOrders(todayOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get('/api/menu/all', { withCredentials: true });
      if (response.data.success) {
        setMenuItems(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  const handleAddItem = (menuItem) => {
    setOrderForm(prev => {
      const existing = prev.items.find(i => i.menuItem === menuItem._id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.menuItem === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return {
        ...prev,
        items: [...prev.items, {
          menuItem: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          prepTime: menuItem.prepTime,
          quantity: 1
        }]
      };
    });
  };

  const handleRemoveItem = (menuItemId) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter(i => i.menuItem !== menuItemId)
    }));
  };

  const handleItemQtyChange = (menuItemId, qty) => {
    const parsed = parseInt(qty);
    if (parsed < 1) return;
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.menuItem === menuItemId ? { ...i, quantity: parsed } : i
      )
    }));
  };

  const getEstimatedTime = () => {
    if (orderForm.items.length === 0) return 0;
    return Math.max(...orderForm.items.map(i => i.prepTime));
  };

  const getTotalAmount = () => {
    return orderForm.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.customerName || orderForm.items.length === 0) {
      alert('Please enter customer name and add at least one item');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/orders/create', {
        customerName: orderForm.customerName,
        customerPhone: orderForm.customerPhone,
        items: orderForm.items.map(i => ({ menuItem: i.menuItem, quantity: i.quantity }))
      }, { withCredentials: true });
      if (response.data.success) {
        alert('Order created successfully!');
        setShowOrderForm(false);
        setOrderForm({ customerName: '', customerPhone: '', items: [] });
        fetchOrders();
      } else {
        alert(response.data.message || 'Failed to create order');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `/api/orders/${orderId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      if (response.data.success) {
        fetchOrders();
      } else {
        alert(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong');
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    if (activeTab === 'ongoing') {
      filtered = filtered.filter(o => ['pending', 'accepted', 'cooking', 'preparing', 'delayed'].includes(o.status));
    } else if (activeTab === 'ready') {
      filtered = filtered.filter(o => o.status === 'ready');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(o => o.status === 'completed');
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(o => o.status === 'cancelled');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const getTabCount = (tab) => {
    if (tab === 'ongoing') return orders.filter(o => ['pending', 'accepted', 'cooking', 'preparing', 'delayed'].includes(o.status)).length;
    if (tab === 'ready') return orders.filter(o => o.status === 'ready').length;
    if (tab === 'completed') return orders.filter(o => o.status === 'completed').length;
    if (tab === 'cancelled') return orders.filter(o => o.status === 'cancelled').length;
    return 0;
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return isToday ? `Today, ${time}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
  };

  const getPickupTime = (order) => {
    const created = new Date(order.createdAt);
    const pickup = new Date(created.getTime() + (order.estimatedTime || 15) * 60 * 1000);
    return formatTime(pickup.toISOString());
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-badge pending';
      case 'accepted': return 'status-badge preparing';
      case 'cooking': return 'status-badge preparing';
      case 'preparing': return 'status-badge preparing';
      case 'ready': return 'status-badge ready';
      case 'completed': return 'status-badge completed';
      case 'cancelled': return 'status-badge cancelled';
      case 'delayed': return 'status-badge cancelled';
      default: return 'status-badge';
    }
  };

  const renderActions = (order) => {
    switch (order.status) {
      case 'pending':
        return (
          <>
            <button className="action-btn reject" onClick={() => handleUpdateStatus(order._id, 'cancelled')}>Reject</button>
            <button className="action-btn accept" onClick={() => handleUpdateStatus(order._id, 'accepted')}>Accept</button>
          </>
        );
      case 'accepted':
        return (
          <button className="action-btn accept" onClick={() => handleUpdateStatus(order._id, 'cooking')}>Start Cooking</button>
        );
      case 'cooking':
      case 'preparing':
      case 'delayed':
        return (
          <>
            <button className="action-btn reject" onClick={() => handleUpdateStatus(order._id, 'delayed')}>Mark Delayed</button>
            <button className="action-btn mark-ready" onClick={() => handleUpdateStatus(order._id, 'ready')}>Mark Ready</button>
          </>
        );
      case 'ready':
        return (
          <button className="action-btn complete" onClick={() => handleUpdateStatus(order._id, 'completed')}>Complete Order</button>
        );
      default:
        return <span className="no-actions">-</span>;
    }
  };

  const filteredOrders = getFilteredOrders();

  return (
    <>
      <div className="content-header">
        <div>
          <div className="breadcrumb">Home / Order Management</div>
          <h1>Order Management</h1>
          <p className="subtitle">Track and manage daily incoming orders</p>
        </div>
        <button className="add-btn" onClick={() => setShowOrderForm(true)}>
          + Add Offline Order
        </button>
      </div>

      <div className="order-tabs">
        {['ongoing', 'ready', 'completed', 'cancelled'].map(tab => (
          <button
            key={tab}
            className={`order-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="tab-count">{getTabCount(tab)}</span>
          </button>
        ))}
        <div className="order-search">
          <input
            type="text"
            placeholder="Search by Order ID or Customer Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {showOrderForm && (
        <div className="form-modal">
          <div className="form-container order-form-container">
            <div className="order-form-header">
              <h2>Create New Order</h2>
              <p>Build an offline order quickly from your current menu items.</p>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="form-row order-customer-row">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    required
                    placeholder="e.g., Ram Prasad Kafle"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                    placeholder="e.g. 9848000000"
                  />
                </div>
              </div>

              <div className="order-menu-select order-section-card">
                <label>Select Items from Menu</label>
                <div className="menu-select-grid">
                  {menuItems.map(item => (
                    <div key={item._id} className="menu-select-item" onClick={() => handleAddItem(item)}>
                      <span className="menu-select-name">{item.name}</span>
                      <div className="menu-select-meta">
                        <span className="menu-select-price">NPR {item.price}</span>
                        <span className={`menu-select-category ${item.category || 'veg'}`}>{item.category || 'veg'}</span>
                      </div>
                      <span className="menu-select-time">{item.prepTime} min</span>
                    </div>
                  ))}
                </div>
              </div>

              {orderForm.items.length > 0 && (
                <div className="order-items-summary order-section-card">
                  <label>Order Items</label>
                  <div className="order-quick-stats">
                    <span className="order-stat-pill">Items: {orderForm.items.length}</span>
                    <span className="order-stat-pill">Total: NPR {getTotalAmount()}</span>
                    <span className="order-stat-pill">ETA: {getEstimatedTime()} min</span>
                  </div>
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Prep Time</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderForm.items.map(item => (
                        <tr key={item.menuItem}>
                          <td>{item.name}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemQtyChange(item.menuItem, e.target.value)}
                              className="qty-input"
                            />
                          </td>
                          <td>NPR {item.price * item.quantity}</td>
                          <td>{item.prepTime} min</td>
                          <td>
                            <button type="button" className="remove-item-btn" onClick={() => handleRemoveItem(item.menuItem)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="order-summary-row">
                    <span><strong>Total: NPR {getTotalAmount()}</strong></span>
                    <span><strong>Estimated Time: {getEstimatedTime()} min</strong></span>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => { setShowOrderForm(false); setOrderForm({ customerName: '', customerPhone: '', items: [] }); }}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn order-create-btn" disabled={loading || orderForm.items.length === 0}>
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="orders-table-container">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>No {activeTab} orders found.</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>ITEMS ORDERED</th>
                <th>EST. TIME</th>
                <th>DINING TIME</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id}>
                  <td className="order-id-cell">#{order.orderId}</td>
                  <td className="customer-cell">
                    <div className="customer-avatar">
                      {order.customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="customer-info">
                      <span className="customer-name">{order.customerName}</span>
                      {order.customerPhone && <span className="customer-phone">{order.customerPhone}</span>}
                      {order.customerId && (
                        <button
                          type="button"
                          className="action-btn accept"
                          onClick={() => navigate(`/restaurant/customer/${order.customerId}`)}
                        >
                          Open Profile
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="items-cell">
                    {order.items.map((item, idx) => (
                      <span key={idx}>{item.quantity}x {item.name}{idx < order.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </td>
                  <td className="est-time-cell">{order.estimatedTime} min</td>
                  <td className="time-cell">{getPickupTime(order)}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {renderActions(order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </>
  );
}

export default OrderManagement;

