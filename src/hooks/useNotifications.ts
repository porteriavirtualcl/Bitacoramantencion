import { useEffect } from 'react';
import { api } from '../api';

export function useNotifications(user: any) {
  useEffect(() => {
    if (!user) return;

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('Service Worker registered with scope:', registration.scope);

          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
          }

          // Get VAPID public key
          const { publicKey } = await api.getVapidPublicKey();
          if (!publicKey) return;

          // Subscribe
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          // Send to server
          await api.subscribeToNotifications(subscription);
          console.log('Push notification subscription successful');
        } catch (error) {
          console.error('Error registering Service Worker or subscribing:', error);
        }
      }
    };

    registerServiceWorker();
  }, [user]);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
