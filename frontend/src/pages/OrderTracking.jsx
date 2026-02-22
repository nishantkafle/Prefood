import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './Dashboard.css';
import './OrderTracking.css';
import SmallBackButton from '../components/SmallBackButton';

const FALLBACK_STAGES = ['Order Created', 'Order Accepted', 'Cooking', 'Ready'];
const TIMER_RUNNING_STATUSES = ['accepted', 'cooking', 'preparing', 'delayed'];
const FOOD_READY_STATUSES = ['ready', 'completed'];

function formatTimeLeft(secondsLeft) {
  if (secondsLeft <= 0) return 'Ready now';
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getFriendlyError(error) {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error?.code === 'ERR_NETWORK') return 'Unable to reach server. Please check your connection and try again.';
  return 'Unable to load order details at the moment. Please try again.';
}

export default function OrderTracking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  const activeOrderIdRef = useRef(null);
  const fetchInFlightRef = useRef(false);

  const isFoodReady = (trackedOrder) => FOOD_READY_STATUSES.includes(trackedOrder?.status);

  const hasTimerRunning = (trackedOrder) => {
    if (!trackedOrder) return false;
    if (isFoodReady(trackedOrder) || trackedOrder.isCancelled) return false;
    if (typeof trackedOrder.timerStarted === 'boolean') {
      return trackedOrder.timerStarted && TIMER_RUNNING_STATUSES.includes(trackedOrder.status);
    }
    return TIMER_RUNNING_STATUSES.includes(trackedOrder.status);
  };

  const fetchOrder = async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      setError(null);
      const res = await axios.get(`http://localhost:4000/api/orders/track/${id}`, { withCredentials: true });
      if (res.data?.success) {
        const trackedOrder = res.data.data;
        setOrder(trackedOrder);
        activeOrderIdRef.current = trackedOrder?._id || null;
        setCountdownSeconds(Number(trackedOrder?.remainingSeconds) || 0);
      } else {
        setError(res.data?.message || 'Unable to load order');
      }
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder();
  }, [id]);

  // Socket refresh
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('socket.io-client');
        const io = mod.io || mod.default;
        socketRef.current = io('http://localhost:4000', { withCredentials: true });

        socketRef.current.on('connect', () => {
          if (activeOrderIdRef.current) {
            socketRef.current.emit('joinOrder', activeOrderIdRef.current);
          }
        });

        socketRef.current.on('orderUpdated', (payload) => {
          if (!payload) return;
          const payloadOrderId = payload.orderId?.toString();
          if (payloadOrderId && payloadOrderId === activeOrderIdRef.current?.toString()) {
            fetchOrder();
          }
        });
      } catch (err) {}
    })();

    return () => {
      if (socketRef.current?.connected && activeOrderIdRef.current) {
        socketRef.current.emit('leaveOrder', activeOrderIdRef.current);
      }
      socketRef.current?.disconnect();
    };
  }, [id]);

  // Join room whenever current order id becomes available/changes
  useEffect(() => {
    const currentId = order?._id;
    if (!currentId || !socketRef.current?.connected) return;
    socketRef.current.emit('joinOrder', currentId);
    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveOrder', currentId);
      }
    };
  }, [order?._id]);

  // Polling fallback and periodic sync
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(fetchOrder, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!order || !hasTimerRunning(order)) return undefined;
    const t = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [order]);

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="header">
          <div className="logo">HotStop</div>
          <div className="header-right"></div>
        </div>
        <div className="dashboard-content">
          <SmallBackButton to="/user/orders" />
          <div className="order-tracking-error">{error}</div>
        </div>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="dashboard-container">
        <div className="header">
          <div className="logo">HotStop</div>
          <div className="header-right"></div>
        </div>
        <div className="dashboard-content">
          <SmallBackButton to="/user/orders" />
          <div className="order-tracking-loading">Loading order...</div>
        </div>
      </div>
    );
  }

  const stages = order.timeline?.stages?.length ? order.timeline.stages : FALLBACK_STAGES;
  const activeIndex = Number.isInteger(order.timeline?.activeStageIndex) ? order.timeline.activeStageIndex : 0;

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right"></div>
      </div>

      <div className="dashboard-content">
        <SmallBackButton to="/user/orders" />
        <div className="content-header">
          <div>
            <div className="breadcrumb">Home / My Orders / View Details</div>
            <h1>Order Details</h1>
            <p className="subtitle">Track real-time status and preparation updates</p>
          </div>
        </div>

        <div className="order-tracking-root">
          <div className="ot-summary-grid">
            <div className="ot-card">
              <div className="ot-label">Order ID</div>
              <div className="ot-value">{order.orderId}</div>
            </div>
            <div className="ot-card">
              <div className="ot-label">Restaurant</div>
              <div className="ot-value">{order.restaurantName || 'Unknown'}</div>
            </div>
            <div className="ot-card">
              <div className="ot-label">Placed At</div>
              <div className="ot-value">{new Date(order.placedAt).toLocaleString()}</div>
            </div>
            <div className="ot-card">
              <div className="ot-label">Total Amount</div>
              <div className="ot-value">NPR {Number(order.totalAmount || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="ot-panel">
            <h3>Ordered Items</h3>
            <div className="ot-items-table-wrap">
              <table className="ot-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={`${it.name}-${idx}`}>
                      <td>{it.name}</td>
                      <td>{it.quantity}</td>
                      <td>NPR {Number(it.price || 0).toFixed(2)}</td>
                      <td>NPR {Number(it.lineTotal || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ot-panel timeline">
            <div className="timeline-header-row">
              <h3>Order Status Timeline</h3>
              {order.isDelayed && <span className="timeline-badge delayed">Delayed</span>}
            </div>
            {order.isCancelled ? (
              <div className="cancelled">Order cancelled</div>
            ) : (
              <div className="stages">
                {stages.map((s, i) => {
                  let stageState = 'upcoming';
                  if (i < activeIndex) stageState = 'completed';
                  else if (i === activeIndex) stageState = 'current';

                  return (
                    <div key={s} className={`stage stage-${stageState}`}>
                      <div className="dot">{i < activeIndex ? '✓' : i + 1}</div>
                      <div className="label">{s}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ot-panel estimate">
            <h3>Estimated Preparation</h3>
            {order.isCancelled ? (
              <div className="ot-eta-value">—</div>
            ) : isFoodReady(order) ? (
              <div className="ot-eta-value">Food ready</div>
            ) : order.isDelayed ? (
              <div className="delayed">Order is delayed. Updated ETA: {order.estimatedTime} mins</div>
            ) : !hasTimerRunning(order) ? (
              <div className="ot-eta-waiting">Timer starts after the restaurant accepts your order.</div>
            ) : (
              <div className="ot-eta-value">{countdownSeconds <= 0 ? 'Ready now' : `Ready in ${formatTimeLeft(countdownSeconds)}`}</div>
            )}
            <div className="meta">Current Status: <strong>{order.status}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
