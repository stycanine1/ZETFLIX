// ZETFLIX Android App Installer & PWA Manager
class ZetflixAppInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    this.init();
  }

  init() {
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Register service worker
    this.registerServiceWorker();
    
    // Setup install prompt listeners
    this.setupInstallPrompt();
    
    // Setup app update checker
    this.setupUpdateChecker();
    
    // Setup offline detection
    this.setupOfflineDetection();
    
    // Setup app shortcuts
    this.setupAppShortcuts();
    
    console.log('ZETFLIX App Installer: Initialized');
  }

  // Check if app is installed or running in standalone mode
  checkInstallStatus() {
    // Check if running in standalone mode (installed as PWA)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');

    // Check if app is installed
    this.isInstalled = this.isStandalone || localStorage.getItem('zetflix_app_installed') === 'true';

    if (this.isInstalled) {
      console.log('ZETFLIX App: Running as installed app');
      this.hideInstallButton();
      this.enableAppFeatures();
    }
  }

  // Register service worker for offline functionality
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ZETFLIX Service Worker: Registered successfully', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailable();
            }
          });
        });
        
        return registration;
      } catch (error) {
        console.error('ZETFLIX Service Worker: Registration failed', error);
      }
    }
  }

  // Setup install prompt handling
  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('ZETFLIX App: Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('ZETFLIX App: Installed successfully');
      this.isInstalled = true;
      localStorage.setItem('zetflix_app_installed', 'true');
      this.hideInstallButton();
      this.showInstallSuccess();
      this.enableAppFeatures();
    });
  }

  // Show install button
  showInstallButton() {
    const downloadBtns = document.querySelectorAll('.download-app-btn');
    downloadBtns.forEach(btn => {
      btn.style.display = 'flex';
      btn.innerHTML = '<i class="fas fa-download"></i><span>Install App</span>';
      btn.onclick = () => this.installApp();
    });
  }

  // Hide install button
  hideInstallButton() {
    const downloadBtns = document.querySelectorAll('.download-app-btn');
    downloadBtns.forEach(btn => {
      btn.style.display = 'none';
    });
  }

  // Install the app
  async installApp() {
    if (!this.deferredPrompt) {
      this.showManualInstallInstructions();
      return;
    }

    try {
      // Show install prompt
      this.deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('ZETFLIX App: User accepted install');
        this.showInstallProgress();
      } else {
        console.log('ZETFLIX App: User dismissed install');
        this.showInstallAlternatives();
      }
      
      this.deferredPrompt = null;
    } catch (error) {
      console.error('ZETFLIX App: Install failed', error);
      this.showInstallError();
    }
  }

  // Show manual install instructions
  showManualInstallInstructions() {
    const modal = this.createModal('Install ZETFLIX App', `
      <div style="text-align: center; padding: 1rem;">
        <i class="fas fa-mobile-alt" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
        <h3 style="margin-bottom: 1rem;">Install ZETFLIX on Your Device</h3>
        
        <div style="text-align: left; margin-bottom: 1.5rem;">
          <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">
            <i class="fab fa-android"></i> Android Chrome:
          </h4>
          <ol style="margin-left: 1rem; line-height: 1.6;">
            <li>Tap the menu (⋮) in Chrome</li>
            <li>Select "Add to Home screen"</li>
            <li>Tap "Add" to install</li>
          </ol>
        </div>
        
        <div style="text-align: left; margin-bottom: 1.5rem;">
          <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">
            <i class="fab fa-firefox"></i> Android Firefox:
          </h4>
          <ol style="margin-left: 1rem; line-height: 1.6;">
            <li>Tap the menu (⋮) in Firefox</li>
            <li>Select "Install"</li>
            <li>Confirm installation</li>
          </ol>
        </div>
        
        <div style="text-align: left; margin-bottom: 1.5rem;">
          <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">
            <i class="fab fa-apple"></i> iPhone/iPad:
          </h4>
          <ol style="margin-left: 1rem; line-height: 1.6;">
            <li>Tap the Share button (□↗)</li>
            <li>Select "Add to Home Screen"</li>
            <li>Tap "Add" to install</li>
          </ol>
        </div>
        
        <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="width: 100%; margin-top: 1rem;">
          <i class="fas fa-check"></i> Got it!
        </button>
      </div>
    `);
    
    document.body.appendChild(modal);
  }

  // Show install progress
  showInstallProgress() {
    const modal = this.createModal('Installing ZETFLIX...', `
      <div style="text-align: center; padding: 2rem;">
        <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
        <h3>Installing ZETFLIX App...</h3>
        <p style="color: var(--text-secondary);">Please wait while we set up your app</p>
      </div>
    `);
    
    document.body.appendChild(modal);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      modal.remove();
    }, 3000);
  }

  // Show install success
  showInstallSuccess() {
    const modal = this.createModal('App Installed Successfully!', `
      <div style="text-align: center; padding: 2rem;">
        <i class="fas fa-check-circle" style="font-size: 4rem; color: #4ade80; margin-bottom: 1rem;"></i>
        <h3 style="margin-bottom: 1rem;">ZETFLIX Installed!</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          The app has been added to your home screen. You can now enjoy ZETFLIX with:
        </p>
        
        <div style="text-align: left; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-wifi" style="color: var(--primary-color);"></i>
            <span>Offline viewing capability</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-rocket" style="color: var(--primary-color);"></i>
            <span>Faster loading times</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-bell" style="color: var(--primary-color);"></i>
            <span>Push notifications for new content</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-mobile-alt" style="color: var(--primary-color);"></i>
            <span>Native app experience</span>
          </div>
        </div>
        
        <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="width: 100%;">
          <i class="fas fa-play"></i> Start Watching
        </button>
      </div>
    `);
    
    document.body.appendChild(modal);
  }

  // Show install alternatives
  showInstallAlternatives() {
    const modal = this.createModal('Alternative Installation', `
      <div style="text-align: center; padding: 1.5rem;">
        <i class="fas fa-info-circle" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
        <h3 style="margin-bottom: 1rem;">No Problem!</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          You can still enjoy ZETFLIX in your browser or install it manually later.
        </p>
        
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="flex: 1;">
            Continue in Browser
          </button>
          <button class="btn btn-primary" onclick="this.closest('.modal').remove(); zetflixInstaller.showManualInstallInstructions();" style="flex: 1;">
            Show Install Guide
          </button>
        </div>
      </div>
    `);
    
    document.body.appendChild(modal);
  }

  // Enable app-specific features
  enableAppFeatures() {
    // Enable push notifications
    this.setupPushNotifications();
    
    // Enable background sync
    this.setupBackgroundSync();
    
    // Add app-specific styles
    document.body.classList.add('app-mode');
    
    // Hide browser UI elements
    this.hideBrowserUI();
  }

  // Setup push notifications
  async setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('ZETFLIX App: Push notifications enabled');
          
          // Subscribe to push notifications
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array('your-vapid-public-key-here')
          });
          
          console.log('ZETFLIX App: Push subscription created', subscription);
        }
      } catch (error) {
        console.error('ZETFLIX App: Push notification setup failed', error);
      }
    }
  }

  // Setup background sync
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('background-sync');
      }).then(() => {
        console.log('ZETFLIX App: Background sync registered');
      }).catch((error) => {
        console.error('ZETFLIX App: Background sync registration failed', error);
      });
    }
  }

  // Setup offline detection
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('ZETFLIX App: Back online');
      this.hideOfflineMessage();
    });

    window.addEventListener('offline', () => {
      console.log('ZETFLIX App: Gone offline');
      this.showOfflineMessage();
    });
  }

  // Show offline message
  showOfflineMessage() {
    const offlineBar = document.createElement('div');
    offlineBar.id = 'offline-bar';
    offlineBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fbbf24;
      color: #000;
      text-align: center;
      padding: 0.5rem;
      font-weight: 600;
      z-index: 9999;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;
    offlineBar.innerHTML = '<i class="fas fa-wifi"></i> You\'re offline. Some features may be limited.';
    
    document.body.appendChild(offlineBar);
    
    setTimeout(() => {
      offlineBar.style.transform = 'translateY(0)';
    }, 100);
  }

  // Hide offline message
  hideOfflineMessage() {
    const offlineBar = document.getElementById('offline-bar');
    if (offlineBar) {
      offlineBar.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        offlineBar.remove();
      }, 300);
    }
  }

  // Setup app shortcuts
  setupAppShortcuts() {
    // Add keyboard shortcuts for app
    document.addEventListener('keydown', (e) => {
      if (this.isStandalone) {
        // Ctrl/Cmd + H = Home
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
          e.preventDefault();
          window.location.hash = '#home';
        }
        
        // Ctrl/Cmd + M = Movies
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
          e.preventDefault();
          window.location.hash = '#movies';
        }
        
        // Ctrl/Cmd + T = TV Shows
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
          e.preventDefault();
          window.location.hash = '#tvshows';
        }
        
        // Ctrl/Cmd + A = Anime
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault();
          window.location.hash = '#anime';
        }
        
        // Ctrl/Cmd + L = My List
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
          e.preventDefault();
          window.location.hash = '#mylist';
        }
      }
    });
  }

  // Setup update checker
  setupUpdateChecker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  // Show update available
  showUpdateAvailable() {
    const updateBar = document.createElement('div');
    updateBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--primary-color);
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 9999;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    `;
    updateBar.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 600px; margin: 0 auto;">
        <span><i class="fas fa-download"></i> New version available!</span>
        <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                style="background: white; color: var(--primary-color); border: none; padding: 0.5rem 1rem; border-radius: 4px; font-weight: 600; cursor: pointer;">
          Update Now
        </button>
      </div>
    `;
    
    document.body.appendChild(updateBar);
    
    setTimeout(() => {
      updateBar.style.transform = 'translateY(0)';
    }, 100);
  }

  // Hide browser UI elements when in app mode
  hideBrowserUI() {
    if (this.isStandalone) {
      // Add app-specific styles
      const appStyles = document.createElement('style');
      appStyles.textContent = `
        .app-mode .navbar {
          padding-top: env(safe-area-inset-top);
        }
        
        .app-mode .main-content {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .app-mode .hero-slider {
          margin-top: calc(100px + env(safe-area-inset-top));
        }
      `;
      document.head.appendChild(appStyles);
    }
  }

  // Utility function to create modal
  createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content" style="max-width: 500px;">
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
        <div style="padding: 1rem;">
          <h2 style="margin-bottom: 1rem; text-align: center;">${title}</h2>
          ${content}
        </div>
      </div>
    `;
    return modal;
  }

  // Utility function for VAPID key conversion
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Initialize the app installer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.zetflixInstaller = new ZetflixAppInstaller();
});

// Export for global access
window.ZetflixAppInstaller = ZetflixAppInstaller;