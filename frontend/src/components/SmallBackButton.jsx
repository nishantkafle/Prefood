import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SmallBackButton.css';

function SmallBackButton({ to = '/', label = '← Back', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(to);
  };

  return (
    <button className={`small-back-btn ${className}`.trim()} onClick={handleBack} type="button">
      {label}
    </button>
  );
}

export default SmallBackButton;
