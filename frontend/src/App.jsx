import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import RoleSelection from './pages/RoleSelection';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import UserDashboard from './pages/UserDashboard';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantRegister from './pages/RestaurantRegister';
import RestaurantDashboard from './pages/RestaurantDashboard';
import OrderTracking from './pages/OrderTracking';
import UserOrders from './pages/UserOrders';

function RoleProtectedRoute({ allowedRole, children }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileRole, setProfileRole] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkProfile = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/auth/profile', { withCredentials: true });
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
    return <Navigate to={allowedRole === 'restaurant' ? '/restaurant/login' : '/user/login'} replace />;
  }

  if (profileRole !== allowedRole) {
    return <Navigate to={profileRole === 'restaurant' ? '/restaurant/dashboard' : '/user/dashboard'} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
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
        <Route path="/restaurant/login" element={<RestaurantLogin />} />
        <Route path="/restaurant/register" element={<RestaurantRegister />} />
        <Route
          path="/restaurant/dashboard"
          element={(
            <RoleProtectedRoute allowedRole="restaurant">
              <RestaurantDashboard />
            </RoleProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  );
}

export default App;
