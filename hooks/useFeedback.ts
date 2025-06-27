import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserFeedback } from '@/lib/types';
import { useAuth } from './useAuth';

export function useFeedback() {
  const { user, profile } = useAuth();
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserFeedback();
    }
  }, [user]);

  const fetchUserFeedback = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (
    type: 'suggestion' | 'bug' | 'praise' | 'other',
    title: string,
    description: string,
    rating?: number
  ) => {
    if (!user || !profile) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          user_name: profile.full_name || 'Anonymous',
          user_email: profile.email || user.email,
          type,
          title,
          description,
          rating: rating || null,
        })
        .select()
        .single();

      if (error) throw error;

      setFeedback(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to submit feedback');
      setError(error.message);
      return { data: null, error };
    }
  };

  const updateFeedback = async (
    feedbackId: string,
    updates: {
      title?: string;
      description?: string;
      rating?: number;
    }
  ) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .update(updates)
        .eq('id', feedbackId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setFeedback(prev => prev.map(f => f.id === feedbackId ? data : f));
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update feedback');
      setError(error.message);
      return { data: null, error };
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('user_feedback')
        .delete()
        .eq('id', feedbackId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFeedback(prev => prev.filter(f => f.id !== feedbackId));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete feedback');
      setError(error.message);
      return { error };
    }
  };

  const getFeedbackByType = (type: string) => {
    return feedback.filter(f => f.type === type);
  };

  const getFeedbackByStatus = (status: string) => {
    return feedback.filter(f => f.status === status);
  };

  return {
    feedback,
    loading,
    error,
    submitFeedback,
    updateFeedback,
    deleteFeedback,
    getFeedbackByType,
    getFeedbackByStatus,
    fetchUserFeedback,
  };
}