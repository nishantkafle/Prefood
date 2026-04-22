import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm Delete", cancelText = "Cancel", type = "danger" }) {
  if (!isOpen) return null;

  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cm-close" onClick={onCancel} aria-label="Close modal">
          <X size={20} />
        </button>
        
        <div className="cm-body">
          <div className={`cm-icon-box ${type}`}>
            <AlertTriangle size={32} />
          </div>
          
          <div className="cm-content">
            <h3>{title}</h3>
            <p>{message}</p>
          </div>
        </div>

        <div className="cm-footer">
          <button className="cm-btn cm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`cm-btn cm-btn-confirm ${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
