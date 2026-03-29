import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

function KitchenHome() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/orders/all', { withCredentials: true });
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const pollId = setInterval(() => {
      fetchOrders();
    }, 15000);
    return () => clearInterval(pollId);
  }, [fetchOrders]);

  const getDateKey = (dateValue) => {
    const date = new Date(dateValue);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayKey = getDateKey(new Date());

  const todayOrders = useMemo(
    () => orders.filter(order => getDateKey(order.createdAt) === todayKey),
    [orders, todayKey]
  );

  const selectedOrders = useMemo(
    () => orders.filter(order => getDateKey(order.createdAt) === selectedDate),
    [orders, selectedDate]
  );

  const todayCompleted = todayOrders.filter(order => order.status === 'completed').length;
  const todayPending = todayOrders.filter(order => order.status === 'pending').length;
  const todayInKitchen = todayOrders.filter(order => ['pending', 'preparing'].includes(order.status)).length;
  const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const selectedCompleted = selectedOrders.filter(order => order.status === 'completed').length;
  const selectedPending = selectedOrders.filter(order => order.status === 'pending').length;
  const selectedInKitchen = selectedOrders.filter(order => ['pending', 'preparing'].includes(order.status)).length;
  const selectedEarnings = selectedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const recentOrders = [...selectedOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusClass = (status) => {
    if (status === 'completed') return 'kh-badge kh-badge-completed';
    if (status === 'ready') return 'kh-badge kh-badge-ready';
    if (status === 'preparing') return 'kh-badge kh-badge-preparing';
    if (status === 'cancelled') return 'kh-badge kh-badge-cancelled';
    return 'kh-badge kh-badge-pending';
  };

  const getStatusLabel = (status) => {
    if (status === 'preparing') return 'In Kitchen';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="kh-home-page">
      <div className="content-header">
        <div>
          <div className="breadcrumb">Dashboard / Home</div>
          <h1>Home</h1>
          <p className="subtitle">Kitchen analytics for today and selected date</p>
        </div>
        <div className="kh-date-filter">
          <label htmlFor="kh-date">Select Date</label>
          <input
            id="kh-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="kh-card-grid">
        <div className="kh-card">
          <p>Today Completed Orders</p>
          <h3>{todayCompleted}</h3>
        </div>
        <div className="kh-card">
          <p>Today Pending Orders</p>
          <h3>{todayPending}</h3>
        </div>
        <div className="kh-card">
          <p>Orders In Kitchen Today</p>
          <h3>{todayInKitchen}</h3>
        </div>
        <div className="kh-card kh-card-accent">
          <p>Today Earnings</p>
          <h3>NPR {todayEarnings.toFixed(2)}</h3>
        </div>
      </div>

      <div className="kh-panel">
        <div className="kh-panel-head">
          <h3>Selected Date Analytics</h3>
          <span>{selectedDate}</span>
        </div>
        <div className="kh-selected-grid-full">
          <div className="kh-mini-stat">
            <div className="kh-mini-icon">✅</div>
            <div>
              <div className="kh-mini-label">Completed</div>
              <div className="kh-mini-value">{selectedCompleted}</div>
            </div>
          </div>
          <div className="kh-mini-stat">
            <div className="kh-mini-icon">⏳</div>
            <div>
              <div className="kh-mini-label">Pending</div>
              <div className="kh-mini-value">{selectedPending}</div>
            </div>
          </div>
          <div className="kh-mini-stat">
            <div className="kh-mini-icon">🔥</div>
            <div>
              <div className="kh-mini-label">In Kitchen</div>
              <div className="kh-mini-value">{selectedInKitchen}</div>
            </div>
          </div>
          <div className="kh-mini-stat">
            <div className="kh-mini-icon">💰</div>
            <div>
              <div className="kh-mini-label">Earnings</div>
              <div className="kh-mini-value">NPR {selectedEarnings.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="kh-panel">
        <div className="kh-panel-head">
          <h3>Recent Orders ({selectedDate})</h3>
          <span>{recentOrders.length} orders</span>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <p>No orders found for selected date.</p>
          </div>
        ) : (
          <div className="kh-table-wrap">
            <table className="kh-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Time</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td>#{order.orderId}</td>
                    <td>{order.customerName}</td>
                    <td>{formatTime(order.createdAt)}</td>
                    <td>{order.items?.length || 0}</td>
                    <td><span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                    <td>NPR {(order.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default KitchenHome;
