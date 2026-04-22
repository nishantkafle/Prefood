import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Home, MessagesSquare, ClipboardList, LogOut, Settings, User } from 'lucide-react';
import DashboardNavbar from './DashboardNavbar';
import NotificationBell from './NotificationBell';
import './UserNavbar.css';

function UserNavbar({ showBrand = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = React.useState(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    fetchProfile();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile', { withCredentials: true });
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('authToken');
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('authToken');
      navigate('/');
    }
  };

  const navItems = [
    {
      label: 'Home',
      icon: <Home size={20} />,
      path: '/user/dashboard',
      onClick: () => navigate('/user/dashboard')
    },
    {
      label: 'My Orders',
      icon: <ClipboardList size={20} />,
      path: '/user/orders',
      onClick: () => navigate('/user/orders')
    },
    {
      label: 'Chats',
      icon: <MessagesSquare size={20} />,
      path: '/user/chats',
      onClick: () => navigate('/user/chats')
    }
  ];

  const rightContent = (
    <div className="user-nav-actions">
      <div className="nav-group">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`user-nav-btn ${location.pathname === item.path ? 'active' : ''}`}
            onClick={item.onClick}
            title={item.label}
          >
            {item.icon}
            <span className="btn-label">{item.label}</span>
          </button>
        ))}
      </div>
      
      <div className="nav-divider" />
      
      <div className="nav-utils">
        <NotificationBell />
        
        <div className="user-profile-dropdown-container" ref={dropdownRef}>
          <button 
            className="user-profile-trigger" 
            onClick={() => setShowDropdown(!showDropdown)}
            title="Profile"
          >
            {profile?.logo ? (
              <img src={profile.logo} alt="Profile" className="user-nav-avatar" />
            ) : (
              <div className="user-nav-avatar-fallback">
                <User size={18} />
              </div>
            )}
            <span className="user-nav-name">{profile?.name?.split(' ')[0] || 'User'}</span>
          </button>

          {showDropdown && (
            <div className="user-nav-dropdown">
              <div className="dropdown-info">
                <p className="dropdown-name">{profile?.name || 'User'}</p>
                <p className="dropdown-email">{profile?.email}</p>
              </div>
              <div className="dropdown-divider" />
              <button 
                className={`dropdown-item ${location.pathname === '/user/settings' ? 'active' : ''}`}
                onClick={() => { navigate('/user/settings'); setShowDropdown(false); }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <button 
                className="dropdown-item logout" 
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-navbar-wrapper">
      <DashboardNavbar 
        rightContent={rightContent} 
      />
    </div>
  );
}

export default UserNavbar;
