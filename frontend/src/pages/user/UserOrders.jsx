import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import '../shared/Dashboard.css';
import { createAppSocket } from '../../config/socket';
import NotificationBell from '../../components/shared/NotificationBell';
import UserNavbar from '../../components/shared/UserNavbar';
import './UserOrders.css';

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
  const [profile, setProfile] = useState(null);
  const socketRef = useRef(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const response = await axios.get('/api/orders/my', { withCredentials: true });
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
    fetchProfile();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!profile?._id) return;

    socketRef.current = createAppSocket();

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUser', profile._id);
    });

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    socketRef.current.on('order:new', handleOrderUpdate);
    socketRef.current.on('order:updated', handleOrderUpdate);
    socketRef.current.on('orderUpdated', handleOrderUpdate);
    socketRef.current.on('order:deleted', handleOrderUpdate);

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [profile?._id]);

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

  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const currentOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="dashboard-container">
      <UserNavbar />

      <div className="dashboard-content">
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
          <div className="orders-table-container" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f4f4f5', overflow: 'hidden' }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Restaurant</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>ETA</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <tr key={order?._id || Math.random()}>
                    <td className="order-id-cell">#{order?.orderId || 'N/A'}</td>
                    <td>{order?.restaurantName || 'Unknown'}</td>
                    <td>
                      {order?.placedAt ? (
                        <>
                          {new Date(order.placedAt).toLocaleDateString()} at{' '}
                          {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : 'Unknown'}
                    </td>
                    <td>{order.itemCount}</td>
                    <td>NPR {Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      <span className={getStatusClass(order.status)}>{order.status}</span>
                    </td>
                    <td>
                      {order.isCancelled
                        ? 'Cancelled'
                        : FOOD_READY_STATUSES.includes(order.status)
                          ? 'Ready'
                          : order.isDelayed
                            ? 'Delayed'
                            : !hasTimerStarted(order)
                              ? 'Pending'
                              : formatTimeLeft(order.remainingSeconds)}
                    </td>
                    <td>
                      <button
                        className="action-btn accept"
                        onClick={() => navigate(`/order/track/${order._id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards List */}
            <div className="order-cards-list">
              {currentOrders.map((order) => (
                <div key={order._id} className="order-mobile-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-card-id">#{order.orderId}</div>
                      <div className="order-card-restaurant">{order.restaurantName || 'Unknown'}</div>
                      <div className="order-card-date">{new Date(order.placedAt).toLocaleDateString()} at {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <span className={getStatusClass(order.status)}>{order.status}</span>
                  </div>
                  
                  <div className="order-card-body">
                    <div className="order-card-left">
                      <div className="order-card-items">{order.itemCount} items</div>
                      <div className="order-card-total">NPR {Number(order.totalAmount || 0).toFixed(2)}</div>
                    </div>
                    
                    <div className="order-card-right">
                      <div className="order-card-eta">
                        {order.isCancelled
                          ? 'Cancelled'
                          : FOOD_READY_STATUSES.includes(order.status)
                            ? 'Ready'
                            : order.isDelayed
                              ? 'Delayed'
                              : !hasTimerStarted(order)
                                ? 'Pending'
                                : formatTimeLeft(order.remainingSeconds)}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    className="order-card-btn"
                    onClick={() => navigate(`/order/track/${order._id}`)}
                  >
                    <Eye size={16} /> View Tracking
                  </button>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="orders-pagination-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '16px', background: '#fff', borderTop: '1px solid #f4f4f5' }}>
                <button
                  className="orders-pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', border: '1px solid #e4e4e7', background: currentPage === 1 ? '#fafafa' : '#fff', color: currentPage === 1 ? '#a1a1aa' : '#18181b', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div className="orders-pagination-text" style={{ fontSize: '14px', fontWeight: '600', color: '#71717a' }}>
                  Page <span style={{ color: '#18181b' }}>{currentPage}</span> of <span style={{ color: '#18181b' }}>{totalPages}</span>
                </div>
                <button
                  className="orders-pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', border: '1px solid #e4e4e7', background: currentPage === totalPages ? '#fafafa' : '#fff', color: currentPage === totalPages ? '#a1a1aa' : '#18181b', borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserOrders;


