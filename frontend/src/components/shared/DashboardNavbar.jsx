import React from 'react';

function DashboardNavbar({
  brand = 'HotStop',
  logoImage,
  logoAlt = 'Logo',
  showLogoPlaceholder = false,
  showDateTime = false,
  rightContent = null
}) {
  const showBrandWithLogo = Boolean(logoImage) || showLogoPlaceholder;

  return (
    <div className="header">
      {showBrandWithLogo ? (
        <div className="header-brand">
          {logoImage ? (
            <img src={logoImage} alt={logoAlt} className="header-logo-img" />
          ) : (
            <div className="header-logo-placeholder">Logo</div>
          )}
          <span className="logo">{brand}</span>
        </div>
      ) : (
        <div className="logo">{brand}</div>
      )}

      {(showDateTime || rightContent) && (
        <div className="header-right">
          {showDateTime && (
            <div className="date-time">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default DashboardNavbar;