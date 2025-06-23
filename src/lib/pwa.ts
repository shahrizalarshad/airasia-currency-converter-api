export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Register service worker
export const registerServiceWorker = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('PWA: Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('PWA: Service worker registered successfully:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('PWA: New service worker installed, refresh required');
              // Optionally show update notification to user
              notifyUpdate();
            }
          });
        }
      });
      
      return true;
    } catch (error) {
      console.error('PWA: Service worker registration failed:', error);
      return false;
    }
  } else {
    console.warn('PWA: Service workers not supported');
    return false;
  }
};

// Handle install prompt
export const initializeInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault(); // Prevent default mini-infobar
    deferredPrompt = e;
    
    // Show custom install button or banner
    showInstallPrompt();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA: App installed successfully');
    deferredPrompt = null;
    hideInstallPrompt();
  });
};

// Show install prompt
const showInstallPrompt = (): void => {
  // Create and show custom install banner
  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #26278D 0%, #1E40AF 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">💱</div>
        <div>
          <div style="font-weight: 600;">Install Currency Converter</div>
          <div style="font-size: 12px; opacity: 0.9;">Quick access from your home screen</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-install-btn" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">Install</button>
        <button id="pwa-close-btn" style="
          background: transparent;
          border: none;
          color: white;
          padding: 8px;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
        ">×</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // Add event listeners
  document.getElementById('pwa-install-btn')?.addEventListener('click', installApp);
  document.getElementById('pwa-close-btn')?.addEventListener('click', hideInstallPrompt);
  
  // Auto-hide after 10 seconds
  setTimeout(hideInstallPrompt, 10000);
};

// Hide install prompt
const hideInstallPrompt = (): void => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.remove();
  }
};

// Install app
const installApp = async (): Promise<void> => {
  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA: Install outcome: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      deferredPrompt = null;
      hideInstallPrompt();
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  }
};

// Notify about updates
const notifyUpdate = (): void => {
  // Create update notification
  const updateNotification = document.createElement('div');
  updateNotification.id = 'pwa-update-notification';
  updateNotification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 1000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 320px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="
          width: 24px;
          height: 24px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        ">🔄</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">Update Available</div>
          <div style="font-size: 12px; opacity: 0.9;">New version ready to install</div>
        </div>
      </div>
      <button id="pwa-update-btn" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        margin-top: 12px;
        width: 100%;
      ">Update Now</button>
    </div>
  `;
  
  document.body.appendChild(updateNotification);
  
  // Add event listener
  document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    updateNotification.remove();
  }, 15000);
};

// Check if app is installed
export const isAppInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
};

// Initialize PWA features
export const initializePWA = (): void => {
  if (typeof window !== 'undefined') {
    registerServiceWorker();
    initializeInstallPrompt();
    
    console.log('PWA: Initialized');
    console.log('PWA: App installed:', isAppInstalled());
  }
}; 