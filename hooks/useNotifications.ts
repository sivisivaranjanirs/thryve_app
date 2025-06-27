import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FriendNotification } from '@/lib/types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to real-time notifications
      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new as FriendNotification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('friend_notifications')
        .select(`
          *,
          friend:friend_id (
            full_name,
            email
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('friend_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark notification as read');
      setError(error.message);
      return { data: null, error };
    }
  };

  const markAllAsRead = async () => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('friend_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark all notifications as read');
      setError(error.message);
      return { error };
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('friend_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete notification');
      setError(error.message);
      return { error };
    }
  };

  const createNotification = async (
    targetUserId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data: notificationId, error } = await supabase.rpc('create_friend_notification', {
        target_user_id: targetUserId,
        from_user_id: user.id,
        notif_type: type,
        notif_title: title,
        notif_message: message,
        notif_data: data || null,
      });

      if (error) throw error;
      return { data: notificationId, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create notification');
      setError(error.message);
      return { data: null, error };
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.is_read).length;
  };

  const getNotificationsByType = (type: string) => {
    return notifications.filter(n => n.notification_type === type);
  };

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    getUnreadCount,
    getNotificationsByType,
  };
}