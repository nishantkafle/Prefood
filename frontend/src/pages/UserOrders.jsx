import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';
import SmallBackButton from '../components/SmallBackButton';

const TIMER_RUNNING_STATUSES = ['accepted', 'cooking', 'preparing', 'delayed'];
const FOOD_READY_STATUSES = ['ready', 'completed'];

function formatTimeLeft(secondsLeft) {
  if (secondsLeft <= 0) return 'Ready now';
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function UserOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasTimerStarted = (order) => {
    if (!order) return false;
    if (FOOD_READY_STATUSES.includes(order.status) || order.isCancelled) return false;
    if (typeof order.timerStarted === 'boolean') {
      return order.timerStarted && TIMER_RUNNING_STATUSES.includes(order.status);
    }
    return TIMER_RUNNING_STATUSES.includes(order.status);
  };

  const fetchOrders = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await axios.get('http://localhost:4000/api/orders/my', { withCredentials: true });
      if (response.data?.success) {
        const rows = Array.isArray(response.data.data) ? response.data.data : [];
        setOrders(rows.map((row) => ({ ...row, remainingSeconds: Number(row.remainingSeconds) || 0 })));
      } else {
        setError(response.data?.message || 'Unable to load your orders');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error while loading your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const polling = setInterval(fetchOrders, 10000);
    return () => clearInterval(polling);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) => prev.map((order) => ({
        ...order,
        remainingSeconds: hasTimerStarted(order) && order.remainingSeconds > 0 ? order.remainingSeconds - 1 : order.remainingSeconds
      })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusClass = (status) => {
    if (status === 'ready') return 'status-badge ready';
    if (status === 'completed') return 'status-badge completed';
    if (status === 'cancelled') return 'status-badge cancelled';
    if (status === 'delayed') return 'status-badge cancelled';
    return 'status-badge preparing';
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right"></div>
      </div>

      <div className="dashboard-content">
        <SmallBackButton to="/user/dashboard" />
        <div className="content-header">
          <div>
            <div className="breadcrumb">Home / My Orders</div>
            <h1>My Orders</h1>
            <p className="subtitle">View all your orders and current status</p>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading your orders...</div>
        ) : error ? (
          <div className="empty-state"><p>{error}</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><p>You have no orders yet.</p></div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Restaurant</th>
                  <th>Date/Time</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.orderId}</td>
                    <td>{order.restaurantName || 'Unknown'}</td>
                    <td>{new Date(order.placedAt).toLocaleString()}</td>
                    <td>{order.itemCount}</td>
                    <td>NPR {Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      {order.isCancelled
                        ? '—'
                        : FOOD_READY_STATUSES.includes(order.status)
                          ? 'Food ready'
                        : order.isDelayed
                          ? `Delayed (${order.estimatedTime} mins)`
                          : !hasTimerStarted(order)
                            ? 'Starts after acceptance'
                          : `Ready in ${formatTimeLeft(order.remainingSeconds)}`}
                    </td>
                    <td>
                      <span className={getStatusClass(order.status)}>{order.status}</span>
                    </td>
                    <td>
                      <button
                        className="action-btn accept"
                        onClick={() => navigate(`/order/track/${order._id}`)}
                      >
                        View Details
                      </button>
                    </td>
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

export default UserOrders;
