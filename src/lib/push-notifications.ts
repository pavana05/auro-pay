import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only work on native platforms');
    return;
  }

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.warn('Push notification permission denied');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('FCM Token:', token.value);
    // Store token in database for sending targeted notifications
    saveFcmToken(token.value);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    // App is in foreground - show in-app notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(notification.title || 'AuroPay', {
        body: notification.body || '',
        icon: '/favicon.ico',
      });
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action:', notification);
    // User tapped the notification - navigate to relevant screen
    const data = notification.notification.data;
    if (data?.route) {
      window.location.href = data.route;
    }
  });
};

const saveFcmToken = async (token: string) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Store token in app_settings or a dedicated table
    // For now, we'll use app_settings with user-specific keys
    await supabase.from('app_settings').upsert({
      key: `fcm_token_${user.id}`,
      value: token,
    }, { onConflict: 'key' });
    
    console.log('FCM token saved');
  } catch (err) {
    console.error('Failed to save FCM token:', err);
  }
};

export const getDeliveredNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return [];
  const result = await PushNotifications.getDeliveredNotifications();
  return result.notifications;
};

export const clearNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.removeAllDeliveredNotifications();
};
