import React, { createContext, useContext, useEffect, useState } from 'react';

const PWAContext = createContext({
  isInstallable: false,
  installPrompt: null,
  installApp: () => { },
});

export const usePWA = () => useContext(PWAContext);

export const PWAProvider = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      // Update UI to show the install button
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If app was installed successfully
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;

    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
    setIsInstallable(false);

    console.log(`User response to the install prompt: ${outcome}`);
  };

  return (
    <PWAContext.Provider value={{ isInstallable, installPrompt, installApp }}>
      {children}
    </PWAContext.Provider>
  );
};
