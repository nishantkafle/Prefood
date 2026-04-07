import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ClipboardList, Home, LogOut } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import './ChatPages.css';

function UserChats() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedUserId = selectedUser?._id;

  const appendUniqueMessage = useCallback((incomingMessage) => {
    if (!incomingMessage?._id) return;
    setMessages((prev) => {
      if (prev.some((entry) => String(entry._id) === String(incomingMessage._id))) {
        return prev;
      }
      return [...prev, incomingMessage];
    });
  }, []);

  const loadConversations = useCallback(async () => {
    const res = await axios.get('/api/chat/conversations', { withCredentials: true });
    if (res.data?.success) {
      setConversations(res.data.data || []);
      return res.data.data || [];
    }
    return [];
  }, []);

  const loadMessages = useCallback(async (otherUserId) => {
    if (!otherUserId) return;
    setChatLoading(true);
    try {
      const res = await axios.get(`/api/chat/messages/${otherUserId}`, { withCredentials: true });
      if (res.data?.success) {
        setMessages(res.data.data?.messages || []);
      }
    } finally {
      setChatLoading(false);
    }
  }, []);

  const getRestaurantById = useCallback(async (restaurantId) => {
    const res = await axios.get('/api/auth/restaurants', { withCredentials: true });
    if (!res.data?.success) return null;
    const restaurant = (res.data.data || []).find((entry) => String(entry._id) === String(restaurantId));
    if (!restaurant) return null;
    return {
      _id: restaurant._id,
      role: 'restaurant',
      name: restaurant.restaurantName || 'Restaurant',
      restaurantName: restaurant.restaurantName,
      logo: restaurant.logo,
      location: restaurant.location
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await axios.get('/api/auth/profile', { withCredentials: true });
        const me = profileRes.data?.data;
        setProfile(me);

        const conversationList = await loadConversations();

        const restaurantIdFromQuery = searchParams.get('restaurantId');
        if (restaurantIdFromQuery) {
          const existing = conversationList.find((c) => String(c.otherUser?._id) === String(restaurantIdFromQuery));
          if (existing?.otherUser) {
            setSelectedUser(existing.otherUser);
            await loadMessages(existing.otherUser._id);
          } else {
            const restaurant = await getRestaurantById(restaurantIdFromQuery);
            if (restaurant) {
              setSelectedUser(restaurant);
              setMessages([]);
            }
          }
        } else if (conversationList.length > 0) {
          setSelectedUser(conversationList[0].otherUser);
          await loadMessages(conversationList[0].otherUser._id);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    })();
  }, [getRestaurantById, loadConversations, loadMessages, searchParams]);

  useEffect(() => {
    if (!profile?._id) return;

    socketRef.current = io('http://localhost:4000', { withCredentials: true });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUser', profile._id);
    });

    socketRef.current.on('chat:newMessage', async (incomingMessage) => {
      const senderId = String(incomingMessage?.senderId || '');
      const receiverId = String(incomingMessage?.receiverId || '');
      const me = String(profile._id);
      const relevantOtherUserId = senderId === me ? receiverId : senderId;

      setConversations((previous) => {
        const filtered = previous.filter((entry) => String(entry.otherUser?._id) !== relevantOtherUserId);
        const known = previous.find((entry) => String(entry.otherUser?._id) === relevantOtherUserId);

        const nextEntry = known ? {
          ...known,
          lastMessage: incomingMessage.message,
          lastMessageAt: incomingMessage.createdAt,
          lastMessageFromMe: senderId === me
        } : null;

        if (nextEntry) return [nextEntry, ...filtered];
        return previous;
      });

      if (selectedUserId && String(selectedUserId) === relevantOtherUserId) {
        appendUniqueMessage(incomingMessage);
      } else {
        const refreshed = await loadConversations();
        if (!selectedUser && refreshed.length > 0) {
          setSelectedUser(refreshed[0].otherUser);
          await loadMessages(refreshed[0].otherUser._id);
        }
      }
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leaveUser', profile._id);
      }
      socketRef.current?.disconnect();
    };
  }, [appendUniqueMessage, loadConversations, loadMessages, profile, selectedUser, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conversation) => {
    setSelectedUser(conversation.otherUser);
    await loadMessages(conversation.otherUser._id);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedUserId || (!text && !selectedImage)) return;

    const response = await axios.post(
      `/api/chat/messages/${selectedUserId}`,
      { message: text, image: selectedImage },
      { withCredentials: true }
    );

    if (response.data?.success) {
      setDraft('');
      setSelectedImage('');
      const sent = response.data.data;
      appendUniqueMessage(sent);
      await loadConversations();
    }
  };

  const handleSelectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const conversationMap = useMemo(() => new Map(conversations.map((entry) => [String(entry.otherUser?._id), entry])), [conversations]);

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
        <div className="dashboard-content"><div className="loading">Loading chats...</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="logo">HotStop</div>
        <div className="header-right">
          <NotificationBell />
          <button className="install-btn" onClick={() => navigate('/user/orders')} aria-label="My Orders" title="My Orders"><ClipboardList size={22} /></button>
          <button className="install-btn" onClick={() => navigate('/user/dashboard')} aria-label="Dashboard" title="Dashboard"><Home size={22} /></button>
          <button className="logout-btn" onClick={handleLogout} aria-label="Logout" title="Logout"><LogOut size={22} /></button>
        </div>
      </div>
      <div className="dashboard-content">
        <div className="chat-page-wrap">
          <div className="chat-sidebar">
            <div className="chat-sidebar-title">All Messages</div>
            {conversations.length === 0 ? (
              <div className="chat-empty">No chats yet</div>
            ) : conversations.map((entry) => {
              const active = String(selectedUserId) === String(entry.otherUser?._id);
              return (
                <button
                  type="button"
                  key={entry.conversationKey}
                  className={`chat-list-item ${active ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(entry)}
                >
                  <div className="chat-list-name">{entry.otherUser?.restaurantName || entry.otherUser?.name || 'Restaurant'}</div>
                  <div className="chat-list-preview">{entry.lastMessage}</div>
                </button>
              );
            })}
          </div>

          <div className="chat-main">
            {!selectedUser ? (
              <div className="chat-empty-main">Select a conversation to start chatting.</div>
            ) : (
              <>
                <div className="chat-main-header">{selectedUser.restaurantName || selectedUser.name || 'Restaurant'}</div>
                <div className="chat-messages">
                  {chatLoading ? (
                    <div className="loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="chat-empty">Start the conversation.</div>
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
                {selectedImage && (
                  <div className="chat-image-preview-wrap">
                    <img src={selectedImage} alt="Preview" className="chat-image-preview" />
                    <button type="button" onClick={() => { setSelectedImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove</button>
                  </div>
                )}
                <div className="chat-input-row">
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSelectImage} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}>Image</button>
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
                {!conversationMap.has(String(selectedUserId)) && (
                  <div className="chat-hint">This chat will appear in All Messages after first message is sent.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserChats;

