import React from 'react';

function AppFooter({
  className = 'ph-footer',
  brand = 'HotStop',
  description = 'This app is for preordering food, not for delivery. It saves your time and reduces waiting time for food.'
}) {
  return (
    <footer className={className}>
      <div>
        <strong>{brand}</strong>
        <p>{description}</p>
      </div>
    </footer>
  );
}

export default AppFooter;