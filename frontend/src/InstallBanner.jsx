import React, { useState, useEffect } from 'react';

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isAppInstalled);

    if (isAppInstalled) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
        // Show iOS instructions after a slight delay
        setTimeout(() => setShowBanner(true), 2000);
    }

    // Android / Chrome: Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div style={bannerStyle}>
      <div style={contentStyle}>
        <img src="/logo192.png" alt="Icon" style={iconStyle} />
        <div style={textContainer}>
          <h4 style={titleStyle}>Install CrushDetector</h4>
          {isIOS ? (
            <p style={descStyle}>Tap Share <span style={{fontSize: '1.2rem'}}>⎋</span> then "Add to Home Screen"</p>
          ) : (
            <p style={descStyle}>Add app to home screen for quick access</p>
          )}
        </div>
        {!isIOS && (
          <button style={btnStyle} onClick={handleInstallClick}>Install</button>
        )}
      </div>
      <button style={closeBtn} onClick={() => setShowBanner(false)}>✕</button>
    </div>
  );
};

const bannerStyle = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  maxWidth: '400px',
  backgroundColor: '#1a1a2e',
  border: '1px solid #FF6B9D',
  borderRadius: '12px',
  padding: '12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  zIndex: 9999,
  color: 'white'
};

const contentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1
};

const iconStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '8px'
};

const textContainer = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flex: 1
};

const titleStyle = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#FF6B9D'
};

const descStyle = {
  margin: '4px 0 0 0',
  fontSize: '12px',
  color: '#ccc'
};

const btnStyle = {
  backgroundColor: '#FF6B9D',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '20px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const closeBtn = {
  background: 'none',
  border: 'none',
  color: '#999',
  fontSize: '16px',
  cursor: 'pointer',
  padding: '0 0 0 8px',
  alignSelf: 'flex-start'
};

export default InstallBanner;
