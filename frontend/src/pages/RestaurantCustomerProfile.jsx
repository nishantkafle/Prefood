import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Home, LogOut } from 'lucide-react';
import SmallBackButton from '../components/SmallBackButton';
import NotificationBell from '../components/NotificationBell';
import './ChatPages.css';

function RestaurantCustomerProfile() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const appendUniqueMessage = (incomingMessage) => {
    if (!incomingMessage?._id) return;
    setMessages((prev) => {
      if (prev.some((entry) => String(entry._id) === String(incomingMessage._id))) {
        return prev;
      }
      return [...prev, incomingMessage];
    });
  };

  const loadPageData = async () => {
    const [meRes, customerRes, chatRes] = await Promise.all([
      axios.get('/api/auth/profile', { withCredentials: true }),
      axios.get(`/api/orders/customer/${customerId}/details`, { withCredentials: true }),
      axios.get(`/api/chat/messages/${customerId}`, { withCredentials: true })
    ]);

    if (meRes.data?.success) setProfile(meRes.data.data);
    if (customerRes.data?.success) {
      setCustomer(customerRes.data.data?.customer || null);
      setOrders(customerRes.data.data?.orders || []);
    }
    if (chatRes.data?.success) {
      setMessages(chatRes.data.data?.messages || []);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadPageData();
      } catch (error) {
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  useEffect(() => {
    if (!profile?._id) return;

    socketRef.current = io('http://localhost:4000', { withCredentials: true });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUser', profile._id);
    });

    socketRef.current.on('chat:newMessage', (incomingMessage) => {
      const senderId = String(incomingMessage?.senderId || '');
      const receiverId = String(incomingMessage?.receiverId || '');
      const me = String(profile._id);
      const relevant = [senderId, receiverId].includes(String(customerId)) && [senderId, receiverId].includes(me);
      if (relevant) {
        appendUniqueMessage(incomingMessage);
      }
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [customerId, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;

    const res = await axios.post(
      `/api/chat/messages/${customerId}`,
      { message: text },
      { withCredentials: true }
    );

    if (res.data?.success) {
      setDraft('');
      appendUniqueMessage(res.data.data);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/login');
    } catch (err) {
      localStorage.removeItem('authToken');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="header"><div className="logo">HotStop</div></div>
        <div className="dashboard-content"><div className="loading">Loading profile...</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right">
          <NotificationBell />
          <button className="install-btn" onClick={() => navigate('/restaurant/dashboard')} aria-label="Dashboard" title="Dashboard"><Home size={22} /></button>
          <button className="logout-btn" onClick={handleLogout} aria-label="Logout" title="Logout"><LogOut size={22} /></button>
        </div>
      </div>
      <div className="dashboard-content">
        <SmallBackButton to="/restaurant/dashboard" label="Back to Dashboard" />

        <div className="customer-profile-head">
          <h1>{customer?.name || 'Customer Profile'}</h1>
          <p>{customer?.email || ''}</p>
        </div>

        <div className="customer-profile-grid">
          <div className="customer-orders-panel">
            <h3>Orders from this user</h3>
            {orders.length === 0 ? (
              <div className="chat-empty">No orders found.</div>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.orderId}</td>
                      <td>{order.status}</td>
                      <td>NPR {Number(order.totalAmount || 0).toFixed(2)}</td>
                      <td>{new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="chat-main customer-chat-main">
            <div className="chat-main-header">Chat with {customer?.name || 'User'}</div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">No messages yet.</div>
              ) : messages.map((message) => {
                const mine = String(message.senderId) === String(profile?._id);
                return (
                  <div key={message._id} className={`chat-bubble-row ${mine ? 'mine' : 'other'}`}>
                    <div className={`chat-bubble ${mine ? 'mine' : 'other'}`}>
                      {message.image && <img src={message.image} alt="Chat upload" className="chat-image" />}
                      {message.message && <div>{message.message}</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <button type="button" onClick={handleSend}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantCustomerProfile;

