import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import './NotificationBell.css';

function NotificationBell() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef(null);
  const wrapRef = useRef(null);

  const loadNotifications = async () => {
    const res = await axios.get('http://localhost:4000/api/notifications', { withCredentials: true });
    if (res.data?.success) {
      setNotifications(res.data.data || []);
      setUnreadCount(Number(res.data.unreadCount) || 0);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await axios.get('http://localhost:4000/api/auth/profile', { withCredentials: true });
        if (me.data?.success) {
          setProfile(me.data.data);
        }
        await loadNotifications();
      } catch (error) {
      }
    })();
  }, []);

  useEffect(() => {
    if (!profile?._id) return;

    socketRef.current = io('http://localhost:4000', { withCredentials: true });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUser', profile._id);
    });

    socketRef.current.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotification = async (notification) => {
    if (!notification?.isRead) {
      await axios.patch(`http://localhost:4000/api/notifications/${notification._id}/read`, {}, { withCredentials: true });
      setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setOpen(false);
    if (notification?.meta?.route) {
      navigate(notification.meta.route);
    }
  };

  const handleReadAll = async () => {
    await axios.patch('http://localhost:4000/api/notifications/read-all', {}, { withCredentials: true });
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="notification-wrap" ref={wrapRef}>
      <button type="button" className="notification-btn" onClick={() => setOpen((prev) => !prev)}>
        Notifications
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button type="button" onClick={handleReadAll}>Read all</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notification-empty">No notifications yet</div>
          ) : notifications.map((notification) => (
            <button
              type="button"
              key={notification._id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => handleOpenNotification(notification)}
            >
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">{new Date(notification.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
