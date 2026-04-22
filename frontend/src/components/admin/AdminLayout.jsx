import React from 'react';
import { LayoutDashboard, Users, Store, LogOut } from 'lucide-react';

function AdminLayout({ children, activeTab, setActiveTab, handleLogout, title }) {
  return (
    <div className="admin-wrapper">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="HotStop Logo" style={{ maxWidth: '250px', maxHeight: '70px', objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            Users
          </button>
          <button
            className={`nav-item ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            <Store size={18} />
            Restaurants
          </button>
        </nav>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-badge">Admin Panel</div>
        </header>

        <div className="admin-content-area">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
