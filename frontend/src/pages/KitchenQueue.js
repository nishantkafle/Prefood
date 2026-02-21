import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

function KitchenQueue() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState(null);
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [editingTimeId, setEditingTimeId] = useState(null);
  const [editingTimeVal, setEditingTimeVal] = useState('');
  const timerRef = useRef(null);
  const pollRef = useRef(null);

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
    }, 10000);
    return () => clearInterval(pollId);
  }, [fetchOrders]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTimes(() => {
        const now = Date.now();
        const times = {};
        orders.forEach(order => {
          const created = new Date(order.createdAt).getTime();
          times[order._id] = Math.floor((now - created) / 1000);
        });
        return times;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [orders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `http://localhost:4000/api/orders/${orderId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      if (response.data.success) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const handleEstimatedTimeEdit = (order) => {
    setEditingTimeId(order._id);
    setEditingTimeVal(String(order.estimatedTime || 15));
  };

  const handleEstimatedTimeSave = async (orderId) => {
    const val = parseInt(editingTimeVal);
    if (!val || val < 1) {
      setEditingTimeId(null);
      return;
    }
    try {
      const response = await axios.put(
        `http://localhost:4000/api/orders/${orderId}/estimated-time`,
        { estimatedTime: val },
        { withCredentials: true }
      );
      if (response.data.success) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, estimatedTime: val } : o));
      }
    } catch (err) {
      console.error('Error updating estimated time:', err);
    }
    setEditingTimeId(null);
  };

  const handleDragStart = (e, order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    if (draggedOrder && draggedOrder.status !== targetStatus) {
      updateOrderStatus(draggedOrder._id, targetStatus);
    }
    setDraggedOrder(null);
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
  };

  const formatEstTime = (minutes) => {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isLate = (order) => {
    const elapsed = elapsedTimes[order._id] || 0;
    return elapsed > (order.estimatedTime || 15) * 60;
  };

  const isPriority = (order) => {
    const elapsed = elapsedTimes[order._id] || 0;
    return elapsed > (order.estimatedTime || 15) * 45 && !isLate(order);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const cookingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const activeOrders = [...pendingOrders, ...cookingOrders];

  const getFilteredActive = () => {
    if (filter === 'priority') return activeOrders.filter(o => isPriority(o));
    if (filter === 'late') return activeOrders.filter(o => isLate(o));
    return activeOrders;
  };

  const maxCapacity = 20;
  const kitchenLoad = Math.min(Math.round((activeOrders.length / maxCapacity) * 100), 100);
  const avgPrepTime = activeOrders.length > 0
    ? Math.round(activeOrders.reduce((sum, o) => sum + (o.estimatedTime || 15), 0) / activeOrders.length)
    : 0;
  const priorityCount = activeOrders.filter(o => isPriority(o)).length;
  const lateCount = activeOrders.filter(o => isLate(o)).length;
  const doneCount = orders.filter(o => o.status === 'ready' || o.status === 'completed').length;

  const getLoadLabel = () => {
    if (kitchenLoad >= 80) return 'Busy';
    if (kitchenLoad >= 50) return 'Moderate';
    return 'Light';
  };

  const getLoadColor = () => {
    if (kitchenLoad >= 80) return '#e53935';
    if (kitchenLoad >= 50) return '#ff9800';
    return '#4caf50';
  };

  const handlePause = () => {
    setPaused(true);
    clearInterval(pollRef.current);
  };

  const handleResume = () => {
    setPaused(false);
    pollRef.current = setInterval(() => {
      fetchOrders();
    }, 10000);
    fetchOrders();
  };

  const renderOrderCard = (order) => {
    const elapsed = elapsedTimes[order._id] || 0;
    const elapsedMin = Math.floor(elapsed / 60);
    const late = isLate(order);
    const priority = isPriority(order);

    return (
      <div
        key={order._id}
        className={`kq-card ${late ? 'kq-card-late' : ''} ${priority ? 'kq-card-priority' : ''} ${draggedOrder?._id === order._id ? 'kq-card-dragging' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, order)}
        onDragEnd={handleDragEnd}
      >
        <div className="kq-card-header">
          <div className="kq-card-title">
            <span className="kq-order-num">Order #{order.orderId}</span>
            <span className="kq-pos-badge">POS: {orders.indexOf(order) + 1}</span>
            {priority && <span className="kq-priority-badge">Priority</span>}
            {late && <span className="kq-late-badge">Late</span>}
          </div>
          <div className="kq-est-time-wrap">
            {editingTimeId === order._id ? (
              <div className="kq-est-edit">
                <input
                  type="number"
                  min="1"
                  className="kq-est-input"
                  value={editingTimeVal}
                  onChange={(e) => setEditingTimeVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEstimatedTimeSave(order._id); if (e.key === 'Escape') setEditingTimeId(null); }}
                  autoFocus
                />
                <span className="kq-est-edit-label">min</span>
                <button className="kq-est-save-btn" onClick={() => handleEstimatedTimeSave(order._id)}>Save</button>
                <button className="kq-est-cancel-btn" onClick={() => setEditingTimeId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="kq-est-time" onClick={() => handleEstimatedTimeEdit(order)} title="Click to edit estimated time">
                {formatEstTime(order.estimatedTime || 15)}
                <span className="kq-est-edit-icon">Edit</span>
              </div>
            )}
          </div>
        </div>
        <div className="kq-card-sub">
          <span className="kq-card-meta">{order.customerName}</span>
          <span className="kq-card-meta">{elapsedMin} min{elapsedMin !== 1 ? 's' : ''} ago</span>
        </div>
        <div className="kq-card-sub" style={{ fontSize: '11px', color: '#999' }}>
          Est. Cooking Time
        </div>

        <div className="kq-card-items">
          {order.items.map((item, idx) => (
            <div key={idx} className="kq-item-chip">
              <span className="kq-item-qty">{item.quantity}x</span>
              <span className="kq-item-name">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="kq-card-actions">
          {order.status === 'pending' && (
            <button className="kq-btn kq-btn-cook" onClick={() => updateOrderStatus(order._id, 'preparing')}>
              Mark as Cooking
            </button>
          )}
          {order.status === 'preparing' && (
            <button className="kq-btn kq-btn-cooked" onClick={() => updateOrderStatus(order._id, 'ready')}>
              Mark as Cooked
            </button>
          )}
          {order.status === 'ready' && (
            <button className="kq-btn kq-btn-complete" onClick={() => updateOrderStatus(order._id, 'completed')}>
              Complete
            </button>
          )}
          <button className="kq-btn kq-btn-reorder" onClick={() => updateOrderStatus(order._id, 'pending')}>
            Reorder
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="content-header">
        <div>
          <div className="breadcrumb">Home / Kitchen Queue</div>
          <h1>Kitchen Queue</h1>
          <p className="subtitle">Manage incoming orders and cooking status</p>
        </div>
        <div className="kq-filter-tabs">
          <button className={`kq-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All Orders <span className="kq-filter-count">{activeOrders.length}</span>
          </button>
          <button className={`kq-filter-btn ${filter === 'priority' ? 'active' : ''}`} onClick={() => setFilter('priority')}>
            Priority <span className="kq-filter-count kq-count-orange">{priorityCount}</span>
          </button>
          <button className={`kq-filter-btn ${filter === 'late' ? 'active' : ''}`} onClick={() => setFilter('late')}>
            Late <span className="kq-filter-count kq-count-red">{lateCount}</span>
          </button>
        </div>
      </div>

      <div className="kq-layout">
        <div className="kq-main">
          <div className="kq-columns">
            <div
              className={`kq-column ${draggedOrder ? 'kq-column-droppable' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pending')}
            >
              <div className="kq-column-header kq-col-pending">
                <span>Pending</span>
                <span className="kq-col-count">{pendingOrders.length}</span>
              </div>
              <div className="kq-column-body">
                {pendingOrders.length === 0 ? (
                  <div className="kq-empty">No pending orders</div>
                ) : (
                  (filter === 'all' ? pendingOrders : getFilteredActive().filter(o => o.status === 'pending')).map(renderOrderCard)
                )}
              </div>
            </div>

            <div
              className={`kq-column ${draggedOrder ? 'kq-column-droppable' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'preparing')}
            >
              <div className="kq-column-header kq-col-cooking">
                <span>Cooking</span>
                <span className="kq-col-count">{cookingOrders.length}</span>
              </div>
              <div className="kq-column-body">
                {cookingOrders.length === 0 ? (
                  <div className="kq-empty">No orders cooking</div>
                ) : (
                  (filter === 'all' ? cookingOrders : getFilteredActive().filter(o => o.status === 'preparing')).map(renderOrderCard)
                )}
              </div>
            </div>

            <div
              className={`kq-column ${draggedOrder ? 'kq-column-droppable' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'ready')}
            >
              <div className="kq-column-header kq-col-ready">
                <span>Ready</span>
                <span className="kq-col-count">{readyOrders.length}</span>
              </div>
              <div className="kq-column-body">
                {readyOrders.length === 0 ? (
                  <div className="kq-empty">No orders ready</div>
                ) : (
                  readyOrders.map(renderOrderCard)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="kq-sidebar">
          <div className="kq-metric-card">
            <div className="kq-metric-header">
              <span className="kq-metric-title">Kitchen Load</span>
              <span className="kq-load-label" style={{ color: getLoadColor() }}>{getLoadLabel()}</span>
            </div>
            <div className="kq-load-percent" style={{ color: getLoadColor() }}>{kitchenLoad}%</div>
            <div className="kq-load-sublabel">Capacity</div>
            <div className="kq-load-bar-bg">
              <div className="kq-load-bar" style={{ width: `${kitchenLoad}%`, background: getLoadColor() }}></div>
            </div>
            <div className="kq-load-wait">Est. Wait Time: <strong>{avgPrepTime > 0 ? `${avgPrepTime}-${avgPrepTime + 5} mins` : '0 mins'}</strong></div>

            <div className="kq-metric-counts">
              <div className="kq-metric-count-item">
                <div className="kq-metric-count-val">{pendingOrders.length}</div>
                <div className="kq-metric-count-label">PENDING</div>
              </div>
              <div className="kq-metric-count-item">
                <div className="kq-metric-count-val" style={{ color: '#ff6600' }}>{cookingOrders.length}</div>
                <div className="kq-metric-count-label">COOKING</div>
              </div>
              <div className="kq-metric-count-item">
                <div className="kq-metric-count-val" style={{ color: '#4caf50' }}>{doneCount}</div>
                <div className="kq-metric-count-label">DONE</div>
              </div>
            </div>
          </div>

          <div className="kq-metric-card">
            <div className="kq-metric-title">Emergency Controls</div>
            <div className="kq-emergency-btns">
              <button
                className={`kq-emergency-btn kq-emergency-pause ${paused ? 'kq-emergency-active' : ''}`}
                onClick={handlePause}
                disabled={paused}
              >
                <div className="kq-emergency-btn-content">
                  <span className="kq-emergency-btn-title">Pause Incoming Orders</span>
                  <span className="kq-emergency-btn-sub">Stop new orders from app</span>
                </div>
                <span className="kq-emergency-icon kq-icon-pause">Pause</span>
              </button>
              <button
                className={`kq-emergency-btn kq-emergency-resume ${!paused ? 'kq-emergency-active' : ''}`}
                onClick={handleResume}
                disabled={!paused}
              >
                <div className="kq-emergency-btn-content">
                  <span className="kq-emergency-btn-title">Resume Orders</span>
                  <span className="kq-emergency-btn-sub">Back to normal operation</span>
                </div>
                <span className="kq-emergency-icon kq-icon-resume">Resume</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

export default KitchenQueue;
