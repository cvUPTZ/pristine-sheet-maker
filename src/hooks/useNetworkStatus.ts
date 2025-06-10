// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network status: Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('Network status: Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check in case status changed before listeners were attached
    // or if the initial state was different from the current navigator.onLine value.
    if (isOnline !== navigator.onLine) {
      setIsOnline(navigator.onLine);
      console.log(`Network status: Corrected to ${navigator.onLine ? 'Online' : 'Offline'} during setup`);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      console.log('Network status: Listeners removed');
    };
    // Rerun the effect if the isOnline state is updated by the correction logic inside the effect.
    // This ensures that if the state is corrected, the log reflects the most up-to-date status.
    // However, generally, we want this effect to run once to set up and clean up listeners.
    // The primary drivers for setIsOnline are the event listeners.
    // The correction is a one-off.
    // Let's simplify the dependency array to [] to avoid re-running the effect just because isOnline changed
    // as the event listeners will handle subsequent changes. The initial correction is fine.
  }, []); // Empty dependency array: set up listeners once, clean up on unmount.

  return isOnline;
};
