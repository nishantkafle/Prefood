import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from 'react-router-dom';
import axios from 'axios';
import { createAppSocket } from './config/socket';
import PublicHome from './pages/public/PublicHome';
import UserDashboard from './pages/user/UserDashboard';
import UserChats from './pages/user/UserChats';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantCustomerProfile from './pages/restaurant/RestaurantCustomerProfile';
import RestaurantMessages from './pages/restaurant/RestaurantMessages';
import OrderTracking from './pages/user/OrderTracking';
import UserOrders from './pages/user/UserOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import PaymentStatus from './pages/user/PaymentStatus';
import UserSettings from './pages/user/UserSettings';
import { PWAProvider } from './pwa/PWAProvider';
import PWAInstallButton from './pwa/PWAInstallButton';

const AUTH_CACHE_TTL_MS = 30000;

const authProfileCache = {
  profile: null,
  role: null,
  checkedAt: 0,
  token: '',
  inFlight: null
};

function getAuthTokenSnapshot() {
  try {
    return localStorage.getItem('authToken') || '';
  } catch (error) {
    return '';
  }
}

function getAuthRoleHint() {
  try {
    return localStorage.getItem('authRole') || null;
  } catch (error) {
    return null;
  }
}

function clearAuthCache() {
  authProfileCache.profile = null;
  authProfileCache.role = null;
  authProfileCache.token = '';
  authProfileCache.checkedAt = Date.now();
  authProfileCache.inFlight = null;
  try {
    localStorage.removeItem('authRole');
  } catch (error) {
  }
}

function getFreshCachedProfile() {
  const token = getAuthTokenSnapshot();
  if (!token) {
    clearAuthCache();
    return null;
  }

  const isFresh = (Date.now() - authProfileCache.checkedAt) < AUTH_CACHE_TTL_MS;
  if (!isFresh || authProfileCache.token !== token || !authProfileCache.profile) {
    return undefined;
  }

  return authProfileCache.profile;
}

async function getProfileCached() {
  const token = getAuthTokenSnapshot();
  if (!token) {
    clearAuthCache();
    return null;
  }

  const cachedProfile = getFreshCachedProfile();
  if (cachedProfile !== undefined) {
    return cachedProfile;
  }

  if (authProfileCache.inFlight) {
    return authProfileCache.inFlight;
  }

  authProfileCache.inFlight = axios.get('/api/auth/profile', { withCredentials: true })
    .then((response) => {
      const profile = response.data?.success && response.data?.data
        ? response.data.data
        : null;
      authProfileCache.profile = profile;
      authProfileCache.role = profile?.role || null;
      if (profile?.role) {
        localStorage.setItem('authRole', profile.role);
      } else {
        localStorage.removeItem('authRole');
      }
      return profile;
    })
    .catch(() => {
      authProfileCache.profile = null;
      authProfileCache.role = null;
      return null;
    })
    .finally(() => {
      authProfileCache.checkedAt = Date.now();
      authProfileCache.token = token;
      authProfileCache.inFlight = null;
    });

  return authProfileCache.inFlight;
}

function getDashboardRouteByRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'restaurant') return '/restaurant/dashboard';
  return '/user/dashboard';
}

function SuspendedAccessScreen() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
    } finally {
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authRole');
      } catch (error) {
      }
      navigate('/');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #fff7ed 0%, #f8fafc 100%)' }}>
      <div style={{ width: '100%', maxWidth: '560px', background: '#fff', borderRadius: '24px', padding: '40px', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.12)', border: '1px solid #fee2e2', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '999px', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', fontSize: '28px', fontWeight: '800' }}>!</div>
        <h1 style={{ margin: '0 0 12px', fontSize: '28px', color: '#111827' }}>Account Suspended</h1>
        <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '16px', lineHeight: 1.6 }}>
          Your account is suspended. Contact customer care for more information.
        </p>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>
          This restaurant account can no longer access dashboard features until it is reactivated.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigate('/')} style={{ border: 'none', background: '#f97316', color: '#fff', borderRadius: '12px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer' }}>
            Go Home
          </button>
          <button type="button" onClick={handleLogout} style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', borderRadius: '12px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleProtectedRoute({ allowedRole, children }) {
  const cachedProfile = getFreshCachedProfile();
  const [checkingAuth, setCheckingAuth] = useState(cachedProfile === undefined);
  const [profile, setProfile] = useState(cachedProfile ?? null);

  useEffect(() => {
    const token = getAuthTokenSnapshot();
    const isFresh = (Date.now() - authProfileCache.checkedAt) < AUTH_CACHE_TTL_MS && authProfileCache.token === token;
    if (isFresh && authProfileCache.profile) {
      setCheckingAuth(false);
      setProfile(authProfileCache.profile);
      return;
    }

    let isMounted = true;

    const checkProfile = async () => {
      const nextProfile = await getProfileCached();
      if (!isMounted) return;

      setProfile(nextProfile);
      setCheckingAuth(false);
    };

    checkProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!profile?._id || profile.role !== 'restaurant') return undefined;

    const socket = createAppSocket();

    socket.on('connect', () => {
      socket.emit('joinUser', profile._id);
    });

    const handleRestaurantStatusChange = (payload) => {
      if (!payload) return;
      if (payload.userId && String(payload.userId) !== String(profile._id)) return;

      if (payload.profile && payload.profile._id) {
        setProfile(payload.profile);
      }

      if (typeof payload.isActive === 'boolean') {
        setProfile((currentProfile) => ({
          ...(currentProfile || {}),
          isActive: payload.isActive
        }));
      }
    };

    socket.on('restaurant:statusChanged', handleRestaurantStatusChange);

    return () => {
      if (socket.connected) {
        socket.emit('leaveUser', profile._id);
      }
      socket.disconnect();
    };
  }, [profile?._id, profile?.role]);

  if (checkingAuth) {
    return <div className="loading">Checking access...</div>;
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.role === 'restaurant' && profile.isActive === false) {
    return <SuspendedAccessScreen />;
  }

  if (profile.role !== allowedRole) {
    return <Navigate to={getDashboardRouteByRole(profile.role)} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<PublicHome />}
        />
        <Route
          path="/login"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/user/login"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/user/register"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/payment-success"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <PaymentStatus />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/user/dashboard"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <UserDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/order/track/:id"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <OrderTracking />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/user/orders"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <UserOrders />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/user/chats"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <UserChats />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/user/settings"
          element={(
            <RoleProtectedRoute allowedRole="user">
              <UserSettings />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/restaurant/login"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/restaurant/register"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/restaurant/dashboard"
          element={(
            <RoleProtectedRoute allowedRole="restaurant">
              <RestaurantDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/restaurant/customer/:customerId"
          element={(
            <RoleProtectedRoute allowedRole="restaurant">
              <RestaurantCustomerProfile />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/restaurant/messages"
          element={(
            <RoleProtectedRoute allowedRole="restaurant">
              <RestaurantMessages />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/login"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <RoleProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </RoleProtectedRoute>
          )}
        />
      </Routes>
      <PWAInstallButton />
    </>
  );
}

function App() {
  const isInsideRouter = useInRouterContext();

  if (isInsideRouter) {
    return <AppRoutes />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

