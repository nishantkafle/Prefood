import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
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

const AUTH_CACHE_TTL_MS = 30000;

const authProfileCache = {
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

function getFreshCachedRole() {
  const token = getAuthTokenSnapshot();
  const isFresh = (Date.now() - authProfileCache.checkedAt) < AUTH_CACHE_TTL_MS;
  if (!isFresh || authProfileCache.token !== token) {
    return undefined;
  }
  return authProfileCache.role;
}

async function getProfileRoleCached() {
  const token = getAuthTokenSnapshot();
  const cachedRole = getFreshCachedRole();
  if (cachedRole !== undefined) {
    return cachedRole;
  }

  if (authProfileCache.inFlight) {
    return authProfileCache.inFlight;
  }

  authProfileCache.inFlight = axios.get('/api/auth/profile', { withCredentials: true })
    .then((response) => {
      const role = response.data?.success && response.data?.data?.role
        ? response.data.data.role
        : null;
      authProfileCache.role = role;
      return role;
    })
    .catch(() => {
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

function RoleProtectedRoute({ allowedRole, children }) {
  const cachedRole = getFreshCachedRole();
  const [checkingAuth, setCheckingAuth] = useState(cachedRole === undefined);
  const [profileRole, setProfileRole] = useState(cachedRole ?? null);

  useEffect(() => {
    if (cachedRole !== undefined) return;

    let isMounted = true;

    const checkProfile = async () => {
      const role = await getProfileRoleCached();
      if (!isMounted) return;

      setProfileRole(role);
      setCheckingAuth(false);
    };

    checkProfile();
    return () => {
      isMounted = false;
    };
  }, [cachedRole]);

  if (checkingAuth) {
    return <div className="loading">Checking access...</div>;
  }

  if (!profileRole) {
    return <Navigate to="/" replace />;
  }

  if (profileRole !== allowedRole) {
    return <Navigate to={getDashboardRouteByRole(profileRole)} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;

