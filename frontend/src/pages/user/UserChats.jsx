import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ClipboardList, Home, LogOut, Phone, ChefHat, Send, Image as ImageIcon } from 'lucide-react';
import NotificationBell from '../../components/shared/NotificationBell';
import UserNavbar from '../../components/shared/UserNavbar';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { createAppSocket } from '../../config/socket';
import '../shared/ChatPages.css';

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
  const [error, setError] = useState('');

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
    try {
      const res = await axios.get('/api/chat/conversations', { withCredentials: true });
      if (res.data?.success) {
        setConversations(res.data.data || []);
        setError('');
        return res.data.data || [];
      }
      throw new Error(res.data?.message || 'Failed to load conversations');
    } catch (err) {
      console.error('Error loading conversations:', err);
      return [];
    }
  }, []);

  const loadMessages = useCallback(async (otherUserId) => {
    if (!otherUserId) return;
    setChatLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/chat/messages/${otherUserId}?limit=200`, { withCredentials: true });
      if (res.data?.success) {
        setMessages(res.data.data?.messages || []);
      } else {
        throw new Error(res.data?.message || 'Failed to load messages');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to load messages');
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
        setError(error.response?.data?.message || error.message || 'Failed to open chats');
      } finally {
        setLoading(false);
      }
    })();
  }, [getRestaurantById, loadConversations, loadMessages, searchParams]);

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
      const relevantOtherUserId = senderId === me ? receiverId : senderId;

      setConversations((previous) => {
        const filtered = previous.filter((entry) => String(entry.otherUser?._id) !== relevantOtherUserId);
        const known = previous.find((entry) => String(entry.otherUser?._id) === relevantOtherUserId);

        const nextEntry = known ? {
          ...known,
          lastMessage: incomingMessage?.message || 'New message',
          lastMessageAt: incomingMessage?.createdAt || new Date().toISOString(),
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

    try {
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
      } else {
        setError(response.data?.message || 'Failed to send message');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to send message');
    }
  };

  const handleSelectImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setChatLoading(true);
      const imageUrl = await uploadImageToCloudinary(file);
      setSelectedImage(imageUrl);
    } catch (err) {
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const conversationMap = useMemo(() => new Map(conversations.map((entry) => [String(entry.otherUser?._id), entry])), [conversations]);



  if (loading) {
    return (
      <div className="dashboard-container">
        <UserNavbar />
        <div className="dashboard-content"><div className="loading">Loading chats...</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <UserNavbar />
      <div className="dashboard-content">
        <div className={`chat-page-wrap ${selectedUser ? 'mobile-detail-active' : ''}`}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', width: '100%', textAlign: 'left', border: 'none', background: active ? '#fff7ed' : 'transparent', borderBottom: '1px solid #f4f4f5', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  {entry.otherUser?.logo ? (
                    <img src={entry.otherUser.logo} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {entry.otherUser?.restaurantName ? entry.otherUser.restaurantName[0].toUpperCase() : 'R'}
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="chat-list-name" style={{ fontWeight: '600', color: active ? '#ea580c' : '#18181b', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{entry?.otherUser?.restaurantName || entry?.otherUser?.name || 'Restaurant'}</div>
                    <div className="chat-list-preview" style={{ fontSize: '13px', color: '#71717a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '4px' }}>{entry?.lastMessage || 'Start a conversation'}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="chat-main">
            {!selectedUser ? (
              <div className="chat-empty-main">Select a conversation to start chatting.</div>
            ) : (
              <>
                <div className="chat-main-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #eaeef4', background: '#fff' }}>
                  <button className="chat-back-btn mobile-only" onClick={() => setSelectedUser(null)}>
                    <ArrowLeft size={20} />
                  </button>
                  {selectedUser.logo ? (
                    <img src={selectedUser.logo} alt="Logo" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e7' }}>
                      <ChefHat size={20} color="#71717a" />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#18181b', marginBottom: '2px' }}>{selectedUser?.restaurantName || selectedUser?.name || 'Restaurant'}</div>
                    <div style={{ fontSize: '13px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={12} /> {selectedUser?.phone || 'No contact number available'}
                    </div>
                  </div>
                </div>
                {error && <div className="chat-error-banner">{error}</div>}
                <div className="chat-messages" style={{ padding: '20px', background: '#fafafa', flex: 1, overflowY: 'auto' }}>
                  {chatLoading ? (
                    <div className="loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="chat-empty">Start the conversation.</div>
                  ) : messages.map((message) => {
                    const mine = String(message.senderId) === String(profile?._id);
                    return (
                      <div key={message._id} className={`chat-bubble-row ${mine ? 'mine' : 'other'}`} style={{ display: 'flex', marginBottom: '16px', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div className={`chat-bubble ${mine ? 'mine' : 'other'}`} style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '16px', fontSize: '14.5px', lineHeight: '1.4', background: mine ? 'var(--brand)' : '#ffffff', color: mine ? '#fff' : '#18181b', borderBottomRightRadius: mine ? '4px' : '16px', borderBottomLeftRadius: mine ? '16px' : '4px', boxShadow: mine ? '0 4px 12px rgba(234, 88, 12, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)', border: mine ? 'none' : '1px solid #f4f4f5' }}>
                          {message.image && <img src={message.image} alt="Chat upload" className="chat-image" style={{ borderRadius: '8px', marginBottom: message.message ? '8px' : '0', width: '100%', maxWidth: '240px' }} />}
                          {message.message && <div style={{ wordBreak: 'break-word' }}>{message.message}</div>}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                {selectedImage && (
                  <div className="chat-image-preview-wrap" style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #eaeef4', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={selectedImage} alt="Preview" className="chat-image-preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--brand)' }} />
                      <button type="button" onClick={() => { setSelectedImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>×</button>
                    </div>
                  </div>
                )}
                <div className="chat-input-row" style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid #eaeef4', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '0 0 8px 8px' }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSelectImage} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#f4f4f5', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} title="Send Image">
                    <ImageIcon size={20} />
                  </button>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    style={{ flex: 1, padding: '14px 20px', border: '1px solid #e4e4e7', borderRadius: '24px', fontSize: '15px', background: '#f8fafc', outline: 'none' }}
                  />
                  <button type="button" onClick={handleSend} disabled={!draft.trim() && !selectedImage} style={{ background: (draft.trim() || selectedImage) ? 'var(--brand)' : '#fdba74', color: '#fff', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (draft.trim() || selectedImage) ? 'pointer' : 'not-allowed', transition: 'all 0.2s', padding: 0, boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)' }}>
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                </div>
                {!conversationMap.has(String(selectedUserId)) && (
                  <div className="chat-hint" style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#a1a1aa' }}>This conversation will be saved once your first message is sent.</div>
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

