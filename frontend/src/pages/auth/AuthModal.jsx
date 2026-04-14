import React from 'react';
import { X } from 'lucide-react';
import CommonLogin from './CommonLogin';
import UserRegister from './UserRegister';
import RestaurantRegister from './RestaurantRegister';

function AuthModal({
  authMode,
  setAuthMode,
  closeAuthModal,
  authLoading,
  authError,
  authSuccess,
  setAuthError,
  loginForm,
  setLoginForm,
  handleAuthLogin,
  registerForm,
  setRegisterForm,
  handleAuthRegister,
  handleLogoChange,
  logoPreview,
  setLogoPreview
}) {
  return (
    <div className="ph-modal-overlay" onClick={closeAuthModal}>
      <div className="ph-popup" onClick={(e) => e.stopPropagation()}>
        <div className="auth-card">
          <button className="rs-modal-close" onClick={closeAuthModal} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}>
            <X size={24} />
          </button>

          {authMode === 'login' ? (
            <CommonLogin
              loginForm={loginForm}
              setLoginForm={setLoginForm}
              handleAuthLogin={handleAuthLogin}
              authError={authError}
              authSuccess={authSuccess}
              authLoading={authLoading}
              setAuthMode={setAuthMode}
              setAuthError={setAuthError}
            />
          ) : (
            <>
              <h2>Create Account</h2>
              <p className="subtitle">Join the premium food discovery platform</p>
              
              <div className="auth-role-tabs">
                <button 
                  className={`auth-role-tab ${registerForm.role === 'user' ? 'active' : ''}`}
                  onClick={() => {
                    setRegisterForm(prev => ({ ...prev, role: 'user' }));
                    setAuthError('');
                  }}
                >
                  As Customer
                </button>
                <button 
                  className={`auth-role-tab ${registerForm.role === 'restaurant' ? 'active' : ''}`}
                  onClick={() => {
                    setRegisterForm(prev => ({ ...prev, role: 'restaurant' }));
                    setAuthError('');
                  }}
                >
                  As Restaurant
                </button>
              </div>

              {registerForm.role === 'user' ? (
                <UserRegister
                  registerForm={registerForm}
                  setRegisterForm={setRegisterForm}
                  handleAuthRegister={handleAuthRegister}
                  authError={authError}
                  authSuccess={authSuccess}
                  authLoading={authLoading}
                  setAuthMode={setAuthMode}
                  setAuthError={setAuthError}
                />
              ) : (
                <RestaurantRegister
                  registerForm={registerForm}
                  setRegisterForm={setRegisterForm}
                  handleAuthRegister={handleAuthRegister}
                  handleLogoChange={handleLogoChange}
                  logoPreview={logoPreview}
                  setLogoPreview={setLogoPreview}
                  authError={authError}
                  authSuccess={authSuccess}
                  authLoading={authLoading}
                  setAuthMode={setAuthMode}
                  setAuthError={setAuthError}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
