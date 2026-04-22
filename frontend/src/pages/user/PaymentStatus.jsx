import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleX, ReceiptText, ArrowRight, Home } from 'lucide-react';
import UserNavbar from '../../components/shared/UserNavbar';
import '../shared/Dashboard.css';
import './PaymentStatus.css';

function PaymentStatus() {
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search);
  const status = query.get('status');
  const orderId = query.get('orderId');
  const reason = query.get('reason');

  const isSuccess = status === 'success';

  return (
    <div className="dashboard-container">
      <UserNavbar />
      <div className="dashboard-content">
        <div className="ps-page">
          <div className={`ps-card ${isSuccess ? 'success' : 'failure'}`}>
            <div className="ps-accent" aria-hidden="true" />

            <div className="ps-icon-wrap" aria-hidden="true">
              {isSuccess ? <CheckCircle2 size={44} /> : <CircleX size={44} />}
            </div>

            <h1 className="ps-title">{isSuccess ? 'Payment Successful' : 'Payment Failed'}</h1>

            <p className="ps-message">
              {isSuccess
                ? 'Your eSewa payment is confirmed and your preorder has been placed.'
                : 'Your payment could not be completed. Please try placing your order again.'}
            </p>

            {orderId && isSuccess && (
              <div className="ps-order-box" role="status" aria-live="polite">
                <div className="ps-order-label">
                  <ReceiptText size={16} />
                  <span>Order ID</span>
                </div>
                <div className="ps-order-value">{orderId}</div>
              </div>
            )}

            {!isSuccess && reason && (
              <p className="ps-reason">
                Reason: {reason.replace(/_/g, ' ')}
              </p>
            )}

            <div className="ps-actions">
              <button type="button" className="ps-btn ps-btn-primary" onClick={() => navigate('/user/orders')}>
                <span>Go to My Orders</span>
                <ArrowRight size={16} />
              </button>

              <button type="button" className="ps-btn ps-btn-secondary" onClick={() => navigate('/user/dashboard')}>
                <Home size={16} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentStatus;
