import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import CommonLogin from './pages/CommonLogin';
import CommonRegister from './pages/CommonRegister';
import UserDashboard from './pages/UserDashboard';
import UserChats from './pages/UserChats';
import RestaurantDashboard from './pages/RestaurantDashboard';
import RestaurantCustomerProfile from './pages/RestaurantCustomerProfile';
import RestaurantMessages from './pages/RestaurantMessages';
import OrderTracking from './pages/OrderTracking';
import UserOrders from './pages/UserOrders';
import AdminDashboard from './pages/AdminDashboard';
import PaymentStatus from './pages/PaymentStatus';

function getDashboardRouteByRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'restaurant') return '/restaurant/dashboard';
  return '/user/dashboard';
}

function PublicOnlyRoute({ children }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileRole, setProfileRole] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkProfile = async () => {
      try {
        const response = await axios.get('/api/auth/profile', { withCredentials: true });
        if (!isMounted) return;

        if (response.data?.success && response.data?.data?.role) {
          setProfileRole(response.data.data.role);
        } else {
          setProfileRole(null);
        }
      } catch (error) {
        if (isMounted) setProfileRole(null);
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    };

    checkProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (checkingAuth) {
    return <div className="loading">Checking access...</div>;
  }

  if (profileRole) {
    return <Navigate to={getDashboardRouteByRole(profileRole)} replace />;
  }

  return children;
}

function RoleProtectedRoute({ allowedRole, children }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileRole, setProfileRole] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkProfile = async () => {
      try {
        const response = await axios.get('/api/auth/profile', { withCredentials: true });
        if (!isMounted) return;

        if (response.data?.success && response.data?.data?.role) {
          setProfileRole(response.data.data.role);
        } else {
          setProfileRole(null);
        }
      } catch (error) {
        if (isMounted) setProfileRole(null);
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    };

    checkProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (checkingAuth) {
    return <div className="loading">Checking access...</div>;
  }

  if (!profileRole) {
    return <Navigate to="/login" replace />;
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
          element={(
            <PublicOnlyRoute>
              <Navigate to="/login" replace />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/login"
          element={(
            <PublicOnlyRoute>
              <CommonLogin />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/user/login"
          element={(
            <PublicOnlyRoute>
              <CommonLogin />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/register"
          element={(
            <PublicOnlyRoute>
              <CommonRegister />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/user/register"
          element={(
            <PublicOnlyRoute>
              <CommonRegister />
            </PublicOnlyRoute>
          )}
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
          path="/restaurant/login"
          element={(
            <PublicOnlyRoute>
              <CommonLogin />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/restaurant/register"
          element={(
            <PublicOnlyRoute>
              <CommonRegister />
            </PublicOnlyRoute>
          )}
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
          element={(
            <PublicOnlyRoute>
              <CommonLogin />
            </PublicOnlyRoute>
          )}
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

