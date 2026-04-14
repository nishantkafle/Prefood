import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import '../shared/Dashboard.css';
import NotificationBell from '../../components/shared/NotificationBell';
import UserNavbar from '../../components/shared/UserNavbar';

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
            <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#fafafa' }}>
                <tr>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Restaurant</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date/Time</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px', color: '#71717a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <tr key={order._id} style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.2s', ':hover': { background: '#fafafa' } }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#18181b' }}>{order.orderId}</td>
                    <td style={{ padding: '16px', color: '#3f3f46' }}>{order.restaurantName || 'Unknown'}</td>
                    <td style={{ padding: '16px', color: '#3f3f46' }}>{new Date(order.placedAt).toLocaleString()}</td>
                    <td style={{ padding: '16px', color: '#3f3f46' }}>{order.itemCount}</td>
                    <td style={{ padding: '16px', color: '#18181b', fontWeight: '600' }}>NPR {Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td style={{ padding: '16px', color: '#3f3f46', fontWeight: '500' }}>
                      {order.isCancelled
                        ? '—'
                        : FOOD_READY_STATUSES.includes(order.status)
                          ? <span style={{ color: '#16a34a' }}>Food ready</span>
                        : order.isDelayed
                          ? <span style={{ color: '#ea580c' }}>Delayed ({order.estimatedTime} mins)</span>
                          : !hasTimerStarted(order)
                            ? <span style={{ color: '#71717a' }}>Waiting...</span>
                          : <span style={{ color: '#f97316' }}>{formatTimeLeft(order.remainingSeconds)}</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={getStatusClass(order.status)} style={{ padding: '6px 12px', borderRadius: '20px', fontWeight: '600' }}>{order.status}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        className="action-btn accept"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#ff6600', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s' }}
                        onClick={() => navigate(`/order/track/${order._id}`)}
                      >
                        <Eye size={16} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '16px', background: '#fff', borderTop: '1px solid #f4f4f5' }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', border: '1px solid #e4e4e7', background: currentPage === 1 ? '#fafafa' : '#fff', color: currentPage === 1 ? '#a1a1aa' : '#18181b', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#71717a' }}>
                  Page <span style={{ color: '#18181b' }}>{currentPage}</span> of <span style={{ color: '#18181b' }}>{totalPages}</span>
                </div>
                <button
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


