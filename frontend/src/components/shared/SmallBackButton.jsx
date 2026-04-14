import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './SmallBackButton.css';

function SmallBackButton({ to, onClick, label = 'Back' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button className="small-back-btn" onClick={handleClick} title={label}>
      <ArrowLeft size={18} />
      <span>{label}</span>
    </button>
  );
}

export default SmallBackButton;
