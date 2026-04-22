import React from 'react';

function AppFooter({
  className = 'ph-footer',
  description = 'This app is for preordering food, not for delivery. It saves your time and reduces waiting time for food.',
  phone = '9860573929',
  email = 'hotstop9860@gmail.com',
  address = 'Tokha Basundhara, Kathmandu'
}) {
  return (
    <footer className={className}>
      <div className="footer-content">
        <div className="footer-info">
          <strong className="brand-text">HotStop</strong>
          <p>{description}</p>
        </div>
        <div className="footer-contact">
          <p><strong>Phone:</strong> {phone}</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Location:</strong> {address}</p>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;