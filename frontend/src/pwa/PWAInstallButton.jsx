import React from 'react';
import { usePWA } from './PWAProvider';
import { Download } from 'lucide-react';

const PWAInstallButton = () => {
  const { isInstallable, installApp } = usePWA();

  if (!isInstallable) {
    return null; // Don't show if not installable or already installed
  }

  return (
    <button
      onClick={installApp}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: '#ff6b00',
        color: '#fff',
        border: 'none',
        borderRadius: '50px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(255, 107, 0, 0.4)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 0, 0.5)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.4)';
      }}
    >
      <Download size={20} />
      <span>Install App</span>
    </button>
  );
};

export default PWAInstallButton;
