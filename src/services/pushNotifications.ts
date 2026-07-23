import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('Permissão de notificação negada pelo usuário.');
    return;
  }

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token) => {
    console.log('FCM Token obtido:', token.value);

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token: token.value,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, token' }
    );

    if (error) {
      console.error('Erro ao salvar token no Supabase:', error);
    }
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('Erro ao registrar push notifications:', err);
  });
}
