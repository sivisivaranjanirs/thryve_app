import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ReadingPermission, ReadingRequest } from '@/lib/types';
import { useAuth } from './useAuth';

export function useReadingPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ReadingPermission[]>([]);
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPermissions();
      fetchRequests();
    }
  }, [user]);

  const fetchPermissions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('reading_permissions')
        .select('*')
        .or(`viewer_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reading_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    }
  };

  const sendReadingRequest = async (ownerEmail: string, message?: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // First, find the user by email
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', ownerEmail)
        .single();

      if (profileError || !profiles) {
        return { error: new Error('User not found with that email') };
      }

      const { data, error } = await supabase
        .from('reading_requests')
        .insert({
          requester_id: user.id,
          owner_id: profiles.id,
          message: message || null,
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send request');
      setError(error.message);
      return { data: null, error };
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.rpc('accept_reading_request', {
        request_id: requestId
      });

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchPermissions(), fetchRequests()]);
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to accept request');
      setError(error.message);
      return { error };
    }
  };

  const declineRequest = async (requestId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.rpc('decline_reading_request', {
        request_id: requestId
      });

      if (error) throw error;

      // Refresh requests
      await fetchRequests();
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to decline request');
      setError(error.message);
      return { error };
    }
  };

  const revokePermission = async (permissionId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('reading_permissions')
        .delete()
        .eq('id', permissionId)
        .eq('owner_id', user.id);

      if (error) throw error;

      setPermissions(prev => prev.filter(p => p.id !== permissionId));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke permission');
      setError(error.message);
      return { error };
    }
  };

  const togglePermissionStatus = async (permissionId: string, status: 'active' | 'blocked') => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('reading_permissions')
        .update({ status })
        .eq('id', permissionId)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPermissions(prev => prev.map(p => p.id === permissionId ? data : p));
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update permission');
      setError(error.message);
      return { data: null, error };
    }
  };

  const getPermissionsICanView = () => {
    return permissions.filter(p => p.viewer_id === user?.id && p.status === 'active');
  };

  const getPermissionsOthersHave = () => {
    return permissions.filter(p => p.owner_id === user?.id);
  };

  const getPendingRequestsReceived = () => {
    return requests.filter(r => r.owner_id === user?.id && r.status === 'pending');
  };

  const getPendingRequestsSent = () => {
    return requests.filter(r => r.requester_id === user?.id && r.status === 'pending');
  };

  return {
    permissions,
    requests,
    loading,
    error,
    sendReadingRequest,
    acceptRequest,
    declineRequest,
    revokePermission,
    togglePermissionStatus,
    getPermissionsICanView,
    getPermissionsOthersHave,
    getPendingRequestsReceived,
    getPendingRequestsSent,
    fetchPermissions,
    fetchRequests,
  };
}