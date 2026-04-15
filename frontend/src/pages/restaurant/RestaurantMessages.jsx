import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, ChefHat, ClipboardList, LogOut, MenuSquare, MessagesSquare, Settings } from 'lucide-react';
import NotificationBell from '../../components/shared/NotificationBell';

import DashboardNavbar from '../../components/shared/DashboardNavbar';
import { createAppSocket } from '../../config/socket';
import '../shared/ChatPages.css';
import '../shared/Dashboard.css';

function RestaurantMessages() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const profileMenuRef = useRef(null);

  const selectedUserId = selectedUser?._id;

  const appendUniqueMessage = (incomingMessage) => {
    if (!incomingMessage?._id) return;
    setMessages((prev) => {
      if (prev.some((entry) => String(entry._id) === String(incomingMessage._id))) {
        return prev;
      }
      return [...prev, incomingMessage];
    });
  };

  const loadConversations = async () => {
    try {
      const res = await axios.get('/api/chat/conversations', { withCredentials: true });
      if (res.data?.success) {
        setConversations(res.data.data || []);
        return res.data.data || [];
      }
      throw new Error(res.data?.message || 'Failed to load conversations');
    } catch (err) {
      console.error('Error loading conversations:', err);
      return [];
    }
  };

  const loadMessages = async (otherUserId) => {
    if (!otherUserId) return;
    try {
      setError('');
      const res = await axios.get(`/api/chat/messages/${otherUserId}?limit=200`, { withCredentials: true });
      if (res.data?.success) {
        setMessages(res.data.data?.messages || []);
      } else {
        throw new Error(res.data?.message || 'Failed to load messages');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to load messages');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await axios.get('/api/auth/profile', { withCredentials: true });
        if (meRes.data?.success) {
          setProfile(meRes.data.data);
        }

        const list = await loadConversations();
        if (list.length > 0) {
          setSelectedUser(list[0].otherUser);
          await loadMessages(list[0].otherUser._id);
        }
      } catch (error) {
        setError(error.response?.data?.message || error.message || 'Failed to open messages');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!profile?._id) return;

    socketRef.current = createAppSocket();
    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUser', profile._id);
    });

    socketRef.current.on('chat:newMessage', async (incomingMessage) => {
      const senderId = String(incomingMessage?.senderId || '');
      const receiverId = String(incomingMessage?.receiverId || '');
      const me = String(profile._id);
      const otherUserId = senderId === me ? receiverId : senderId;

      if (selectedUserId && String(selectedUserId) === otherUserId) {
        appendUniqueMessage(incomingMessage);
      }

      try {
        await loadConversations();
      } catch (err) {
        // Log refresh failure but don't crash
        console.error('Failed to refresh conversations:', err);
      }
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [profile, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelectUser = async (conversation) => {
    setSelectedUser(conversation.otherUser);
    await loadMessages(conversation.otherUser._id);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedUserId || !text) return;

    try {
      const res = await axios.post(
        `/api/chat/messages/${selectedUserId}`,
        { message: text },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setDraft('');
        appendUniqueMessage(res.data.data);
        await loadConversations();
      } else {
        setError(res.data?.message || 'Failed to send message');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to send message');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/');
    } catch (err) {
      localStorage.removeItem('authToken');
      navigate('/');
    }
  };

  const goToDashboardSection = (section) => {
    navigate('/restaurant/dashboard', { state: { section } });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <DashboardNavbar />
        <div className="dashboard-content"><div className="loading">Loading messages...</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <DashboardNavbar
        logoImage={profile?.logo}
        showLogoPlaceholder
        showDateTime
        rightContent={(
          <>
            <NotificationBell />
          </>
        )}
      />

      <div className="dashboard-main">
        <div className="sidebar">
          <div className="sidebar-top">
            <div className="sidebar-item" onClick={() => goToDashboardSection('home')}>
              <BarChart3 size={18} />
              Kitchen Analytics
            </div>
            <div className="sidebar-item" onClick={() => goToDashboardSection('kitchen')}>
              <ChefHat size={18} />
              Kitchen Queue
            </div>
            <div className="sidebar-item" onClick={() => goToDashboardSection('menu')}>
              <MenuSquare size={18} />
              Menu Management
            </div>
            <div className="sidebar-item" onClick={() => goToDashboardSection('orders')}>
              <ClipboardList size={18} />
              Orders Management
            </div>
            <div className="sidebar-item active">
              <MessagesSquare size={18} />
              Messages
            </div>
          </div>

          <div className="sidebar-bottom" ref={profileMenuRef}>
            <button
              className="profile-trigger"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              type="button"
            >
              {profile?.logo ? (
                <img src={profile.logo} alt="Profile" className="profile-trigger-image" />
              ) : (
                <div className="profile-trigger-fallback">
                  {(profile?.restaurantName || 'R').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="profile-trigger-name">{profile?.restaurantName || 'Restaurant Profile'}</span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <button
                  className="profile-dropdown-item"
                  onClick={() => {
                    goToDashboardSection('settings');
                    setShowProfileMenu(false);
                  }}
                  type="button"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  className="profile-dropdown-item logout"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          <div className="content-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="breadcrumb">Home / Messages</div>
              <h1>Messages</h1>
              <p className="subtitle">Chat details with user name and number</p>
            </div>
          </div>

          <div className="chat-page-wrap">
            <div className="chat-sidebar">
              <div className="chat-sidebar-title">Users</div>
                  {conversations.length === 0 ? (
                <div className="chat-empty">No user messages yet</div>
              ) : conversations.map((conversation) => {
                const user = conversation?.otherUser || {};
                const active = String(selectedUserId) === String(user?._id);
                return (
                  <button
                    key={conversation.conversationKey}
                    type="button"
                    className={`chat-list-item ${active ? 'active' : ''}`}
                    onClick={() => handleSelectUser(conversation)}
                  >
                    <div className="chat-list-name">{user?.name || 'User'}</div>
                    <div className="chat-list-preview">{user?.phone ? `Phone: ${user.phone}` : 'Phone: Not provided'}</div>
                  </button>
                );
              })}
            </div>

            <div className="chat-main">
              {!selectedUser ? (
                <div className="chat-empty-main">Select a user to view message details.</div>
              ) : (
                <>
                  <div className="chat-main-header">
                    <div>{selectedUser?.name || 'User'}</div>
                    <div className="chat-header-phone">{selectedUser?.phone ? `Phone: ${selectedUser.phone}` : 'Phone: Not provided'}</div>
                  </div>
                  {error && <div className="chat-error-banner">{error}</div>}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantMessages;

