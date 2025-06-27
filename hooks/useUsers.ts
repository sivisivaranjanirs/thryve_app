import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';
import { useAuth } from './useAuth';

export function useUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', user.id) // Exclude current user
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!user || !query.trim()) {
      await fetchUsers();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', user.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const getUserById = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user');
      return { data: null, error };
    }
  };

  const getUserByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user');
      return { data: null, error };
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    searchUsers,
    getUserById,
    getUserByEmail,
  };
}