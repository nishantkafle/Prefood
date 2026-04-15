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
      const response = await axios.get('/api/orders/all', { withCredentials: true });
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(() => {
      fetchOrders();
    }, 10000);
    return () => {
      clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [fetchOrders]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTimes(() => {
        const now = Date.now();
        const times = {};
        orders.forEach(order => {
          const base = getTimerBaseTime(order);
          times[order._id] = Math.max(0, Math.floor((now - base) / 1000));
        });
        return times;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [orders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `/api/orders/${orderId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      if (response.data.success) {
        setOrders(prev => prev.map(o => {
          if (o._id !== orderId) return o;
          const shouldSetAcceptedAt = !o.acceptedAt && ['accepted', 'cooking', 'preparing', 'delayed', 'ready', 'completed'].includes(newStatus);
          return {
            ...o,
            status: newStatus,
            acceptedAt: shouldSetAcceptedAt ? new Date().toISOString() : o.acceptedAt
          };
        }));
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
        `/api/orders/${orderId}/estimated-time`,
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

  const formatSeconds = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isFoodReady = (order) => ['ready', 'completed'].includes(order.status);

  const isTimerStarted = (order) => ['accepted', 'cooking', 'preparing', 'delayed'].includes(order.status);

  const getTimerBaseTime = (order) => {
    if (order.acceptedAt) return new Date(order.acceptedAt).getTime();
    if (isTimerStarted(order) && order.updatedAt) return new Date(order.updatedAt).getTime();
    return new Date(order.createdAt).getTime();
  };

  const getRemainingSeconds = (order) => {
    if (!isTimerStarted(order)) return (order.estimatedTime || 15) * 60;
    const elapsed = elapsedTimes[order._id] || 0;
    return Math.max(0, (order.estimatedTime || 15) * 60 - elapsed);
  };

  const isLate = (order) => {
    if (!isTimerStarted(order)) return false;
    const elapsed = elapsedTimes[order._id] || 0;
    return elapsed > (order.estimatedTime || 15) * 60;
  };

  const isPriority = (order) => {
    if (!isTimerStarted(order)) return false;
    const elapsed = elapsedTimes[order._id] || 0;
    return elapsed > (order.estimatedTime || 15) * 45 && !isLate(order);
  };

  const getScheduleReleaseTimestamp = (order) => {
    if (!order?.dineInAt) return null;
    const dineInAt = new Date(order.dineInAt).getTime();
    if (!Number.isFinite(dineInAt)) return null;
    const prepMinutes = Math.max(1, Number(order.estimatedTime) || 0);
    return dineInAt - prepMinutes * 60 * 1000;
  };

  const getComparableTimestamp = (value, fallback = 0) => {
    const ts = Number(value);
    return Number.isFinite(ts) ? ts : fallback;
  };

  const sortOrdersForKitchenFlow = (a, b) => {
    const aScheduled = Boolean(a.dineInAt);
    const bScheduled = Boolean(b.dineInAt);

    // Scheduled orders should be handled first in queue views.
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;

    if (aScheduled && bScheduled) {
      const aRelease = getComparableTimestamp(getScheduleReleaseTimestamp(a), Number.MAX_SAFE_INTEGER);
      const bRelease = getComparableTimestamp(getScheduleReleaseTimestamp(b), Number.MAX_SAFE_INTEGER);
      if (aRelease !== bRelease) return aRelease - bRelease;
    }

    const aCreated = getComparableTimestamp(new Date(a.createdAt).getTime(), Number.MAX_SAFE_INTEGER);
    const bCreated = getComparableTimestamp(new Date(b.createdAt).getTime(), Number.MAX_SAFE_INTEGER);
    return aCreated - bCreated;
  };

  const pendingOrders = [...orders.filter(o => o.status === 'pending')].sort(sortOrdersForKitchenFlow);
  const cookingOrders = [...orders.filter(o => ['accepted', 'cooking', 'preparing', 'delayed'].includes(o.status))].sort(sortOrdersForKitchenFlow);
  const readyOrders = [...orders.filter(o => o.status === 'ready')].sort(sortOrdersForKitchenFlow);
  const activeOrders = [...pendingOrders, ...cookingOrders];

  const getFilteredActive = () => {
    if (filter === 'priority') return activeOrders.filter(o => isPriority(o));
    if (filter === 'late') return activeOrders.filter(o => isLate(o));
    return activeOrders;
  };

  const priorityCount = activeOrders.filter(o => isPriority(o)).length;
  const lateCount = activeOrders.filter(o => isLate(o)).length;

  const handlePause = () => {
    setPaused(true);
    clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const handleResume = () => {
    setPaused(false);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchOrders();
    }, 10000);
    fetchOrders();
  };

  const renderOrderCard = (order, positionIndex = null) => {
    const elapsed = elapsedTimes[order._id] || 0;
    const elapsedMin = Math.floor(elapsed / 60);
    const late = isLate(order);
    const priority = isPriority(order);
    const timerStarted = isTimerStarted(order);
    const remainingSeconds = getRemainingSeconds(order);
    const hasFutureDineIn = Boolean(order.dineInAt) && new Date(order.dineInAt).getTime() > Date.now();

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
            <span className="kq-pos-badge">POS: {positionIndex ?? (orders.indexOf(order) + 1)}</span>
            {priority && <span className="kq-priority-badge">Priority</span>}
            {late && <span className="kq-late-badge">Late</span>}
          </div>
          <div className="kq-est-time-wrap">
            <div className="kq-est-time">{formatEstTime(order.estimatedTime || 15)}</div>
          </div>
        </div>
        <div className="kq-card-sub">
          <span className="kq-card-meta">{order.customerName}</span>
          <span className="kq-card-meta">{isFoodReady(order) ? 'Food ready for pickup' : timerStarted ? `${elapsedMin} min${elapsedMin !== 1 ? 's' : ''} since accepted` : 'Waiting for acceptance'}</span>
        </div>
        <div className="kq-time-edit-row">
          <span className="kq-time-edit-label">Preparation time</span>
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
            <button className="kq-time-edit-trigger" onClick={() => handleEstimatedTimeEdit(order)}>
              Change ({order.estimatedTime || 15} min)
            </button>
          )}
        </div>
        <div className="kq-card-sub" style={{ fontSize: '11px', color: '#999' }}>
          Est. Cooking Time
        </div>
        <div className="kq-card-sub" style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>
          {isFoodReady(order) ? 'Food ready' : timerStarted ? `Time Left: ${formatSeconds(remainingSeconds)}` : 'Timer starts after acceptance'}
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
            <button className="kq-btn kq-btn-cook" onClick={() => updateOrderStatus(order._id, 'accepted')}>
              {hasFutureDineIn ? 'Accept and Schedule' : 'Accept Order'}
            </button>
          )}
          {['accepted', 'cooking', 'preparing', 'delayed'].includes(order.status) && (
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
                  (filter === 'all' ? pendingOrders : getFilteredActive().filter(o => o.status === 'pending')).map((order, idx) => renderOrderCard(order, idx + 1))
                )}
              </div>
            </div>

            <div
              className={`kq-column ${draggedOrder ? 'kq-column-droppable' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'cooking')}
            >
              <div className="kq-column-header kq-col-cooking">
                <span>Cooking</span>
                <span className="kq-col-count">{cookingOrders.length}</span>
              </div>
              <div className="kq-column-body">
                {cookingOrders.length === 0 ? (
                  <div className="kq-empty">No orders cooking</div>
                ) : (
                  (filter === 'all' ? cookingOrders : getFilteredActive().filter(o => ['accepted', 'cooking', 'preparing', 'delayed'].includes(o.status))).map((order, idx) => renderOrderCard(order, idx + 1))
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
                  readyOrders.map((order, idx) => renderOrderCard(order, idx + 1))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="kq-sidebar">
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

