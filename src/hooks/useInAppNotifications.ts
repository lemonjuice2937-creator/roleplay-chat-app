import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import type { Usuario } from '../types/database';

export function useInAppNotifications(
  activeChatUserId: string | undefined,
  onNavigate: (chatId: string, partner: Usuario) => void
) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification) => {
        const senderId = notification.data?.sender_id as string | undefined;

        if (senderId && senderId !== activeChatUserId) {
          const title = notification.title || 'Nova mensagem';
          const body = notification.body || '';

          if (!title && !body) return;

          const { data: profile } = await supabase
            .from('usuarios')
            .select('display_name')
            .eq('id', senderId)
            .single();

          showToast(profile?.display_name || title, body);
        }
      }
    );

    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (action) => {
        const data = action.notification.data;
        const chatId = data?.chat_id as string | undefined;
        const senderId = data?.sender_id as string | undefined;

        if (chatId && senderId) {
          const { data: partner } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', senderId)
            .single();

          if (partner) {
            onNavigate(chatId, partner as Usuario);
          }
        }
      }
    );

    return () => {
      notificationListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
    };
  }, [activeChatUserId, onNavigate]);
}
