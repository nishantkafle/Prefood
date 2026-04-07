import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Bell } from 'lucide-react';
import './NotificationBell.css';

function NotificationBell() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [popupNotifications, setPopupNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef(null);
  const wrapRef = useRef(null);
  const popupTimeoutsRef = useRef({});

  const loadNotifications = async () => {
    const res = await axios.get('/api/notifications', { withCredentials: true });
    if (res.data?.success) {
      setNotifications(res.data.data || []);
      setUnreadCount(Number(res.data.unreadCount) || 0);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await axios.get('/api/auth/profile', { withCredentials: true });
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
      setPopupNotifications((prev) => [notification, ...prev].slice(0, 4));
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [profile]);

  useEffect(() => {
    popupNotifications.forEach((notification) => {
      if (popupTimeoutsRef.current[notification._id]) return;

      popupTimeoutsRef.current[notification._id] = setTimeout(() => {
        setPopupNotifications((prev) => prev.filter((item) => item._id !== notification._id));
        delete popupTimeoutsRef.current[notification._id];
      }, 4500);
    });
  }, [popupNotifications]);

  useEffect(() => {
    return () => {
      Object.values(popupTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      popupTimeoutsRef.current = {};
    };
  }, []);

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
      await axios.patch(`/api/notifications/${notification._id}/read`, {}, { withCredentials: true });
      setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (popupTimeoutsRef.current[notification._id]) {
      clearTimeout(popupTimeoutsRef.current[notification._id]);
      delete popupTimeoutsRef.current[notification._id];
    }
    setPopupNotifications((prev) => prev.filter((item) => item._id !== notification._id));

    setOpen(false);
    if (notification?.meta?.route) {
      navigate(notification.meta.route);
    }
  };

  const handleReadAll = async () => {
    await axios.patch('/api/notifications/read-all', {}, { withCredentials: true });
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    Object.values(popupTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    popupTimeoutsRef.current = {};
    setPopupNotifications([]);
  };

  return (
    <div className="notification-wrap" ref={wrapRef}>
      {popupNotifications.length > 0 && (
        <div className="notification-toast-stack">
          {popupNotifications.map((notification) => (
            <button
              type="button"
              key={`toast-${notification._id}`}
              className="notification-toast"
              onClick={() => handleOpenNotification(notification)}
            >
              <div className="notification-toast-title">{notification.title}</div>
              <div className="notification-toast-message">{notification.message}</div>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="notification-btn" onClick={() => setOpen((prev) => !prev)} aria-label="Notifications" title="Notifications">
        <Bell size={22} />
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

