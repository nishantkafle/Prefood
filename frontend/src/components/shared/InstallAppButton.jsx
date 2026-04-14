import React from 'react';
import { Download } from 'lucide-react';

function InstallAppButton({
  className = 'install-btn',
  iconSize = 20,
  label = 'Install App',
  showLabel = true,
  onClick
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Download size={iconSize} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}

export default InstallAppButton;