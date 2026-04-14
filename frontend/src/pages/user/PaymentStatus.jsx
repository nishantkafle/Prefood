import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserNavbar from '../../components/shared/UserNavbar';
import '../shared/Dashboard.css';

function PaymentStatus() {
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search);
  const status = query.get('status');
  const orderId = query.get('orderId');

  const isSuccess = status === 'success';

  return (
    <div className="dashboard-container">
      <UserNavbar />
      <div className="dashboard-content">
        <div className="payment-status-page">
          <div className={`payment-status-card ${isSuccess ? 'success' : 'failure'}`}>
            <h1>{isSuccess ? 'Payment Successful' : 'Payment Failed'}</h1>
            <p>
              {isSuccess
                ? 'Your eSewa payment is confirmed and your preorder has been placed.'
                : 'Your payment could not be completed. Please try placing your order again.'}
            </p>
            {orderId && isSuccess && <p className="payment-order-id">Order ID: {orderId}</p>}
            <div className="payment-status-actions">
              <button type="button" onClick={() => navigate('/user/orders')}>Go to My Orders</button>
              <button type="button" className="secondary" onClick={() => navigate('/user/dashboard')}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentStatus;
