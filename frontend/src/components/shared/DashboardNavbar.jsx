import React, { useEffect, useState } from 'react';

function DashboardNavbar({
  brand = 'HotStop',
  logoImage,
  logoAlt = 'Logo',
  showLogoPlaceholder = false,
  showDateTime = false,
  rightContent = null
}) {
  const [now, setNow] = useState(() => new Date());
  const showBrandWithLogo = Boolean(logoImage) || showLogoPlaceholder;

  useEffect(() => {
    if (!showDateTime) return undefined;

    const timerId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, [showDateTime]);

  return (
    <div className="header">
      <div className="header-brand">
        <img src="/logo.png" alt="HotStop Logo" style={{ maxWidth: '250px', maxHeight: '70px', objectFit: 'contain' }} />
      </div>

      {(showDateTime || rightContent) && (
        <div className="header-right">
          {showDateTime && (
            <div className="date-time">
              {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default DashboardNavbar;