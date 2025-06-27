import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HealthMetric, HealthMetricEntry, MetricType } from '@/lib/types';
import { useAuth } from './useAuth';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export function useHealthMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const addMetric = async (metric: HealthMetricEntry) => {
    if (!user) return { error: new Error('No user logged in') };

    return Sentry.startSpan(
      {
        op: "db.health_metrics.create",
        name: "Add Health Metric",
      },
      async (span) => {
        span.setAttribute("metric_type", metric.metric_type);
        span.setAttribute("has_notes", !!metric.notes);
        
        try {
          logger.info('Adding health metric', { 
            type: metric.metric_type,
            hasNotes: !!metric.notes
          });
          
      const { data, error } = await supabase
        .from('health_metrics')
        .insert({
          user_id: user.id,
          metric_type: metric.metric_type,
          value: metric.value,
          unit: metric.unit,
          notes: metric.notes || null,
          recorded_at: metric.recorded_at,
        })
        .select()
        .single();

      if (error) throw error;

      setMetrics(prev => [data, ...prev]);
          logger.info('Health metric added successfully', { id: data.id, type: metric.metric_type });
      return { data, error: null };
    } catch (err) {
          logger.error('Failed to add health metric', { error: err instanceof Error ? err.message : 'Unknown error' });
          Sentry.captureException(err);
      const error = err instanceof Error ? err : new Error('Failed to add metric');
      setError(error.message);
      return { data: null, error };
    }
      }
    );
  };

  const updateMetric = async (id: string, updates: Partial<HealthMetricEntry>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setMetrics(prev => prev.map(m => m.id === id ? data : m));
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update metric');
      setError(error.message);
      return { data: null, error };
    }
  };

  const deleteMetric = async (id: string) => {
    if (!user) return { error: new Error('No user logged in') };

    return Sentry.startSpan(
      {
        op: "db.health_metrics.delete",
        name: "Delete Health Metric",
      },
      async (span) => {
        span.setAttribute("metric_id", id);
        
        try {
          logger.info('Deleting health metric', { id });
          
      const { error } = await supabase
        .from('health_metrics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setMetrics(prev => prev.filter(m => m.id !== id));
          logger.info('Health metric deleted successfully', { id });
      return { error: null };
    } catch (err) {
          logger.error('Failed to delete health metric', { 
            id,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          Sentry.captureException(err);
      const error = err instanceof Error ? err : new Error('Failed to delete metric');
      setError(error.message);
      return { error };
    }
      }
    );
  };

  const getMetricsByType = (type: MetricType) => {
    return metrics.filter(m => m.metric_type === type);
  };

  const getLatestMetric = (type: MetricType) => {
    const typeMetrics = getMetricsByType(type);
    return typeMetrics.length > 0 ? typeMetrics[0] : null;
  };

  const getMetricStats = (type: MetricType, days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentMetrics = getMetricsByType(type).filter(
      m => new Date(m.recorded_at) >= cutoffDate
    );

    if (recentMetrics.length === 0) {
      return { count: 0, average: 0, trend: 'stable' };
    }

    // For simple metrics like weight, heart rate, temperature, blood glucose
    if (['weight', 'heart_rate', 'temperature', 'blood_glucose'].includes(type)) {
      const values = recentMetrics.map(m => parseFloat(m.value));
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      // Simple trend calculation (comparing first half to second half)
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      
      if (firstHalf.length === 0 || secondHalf.length === 0) {
        return { count: recentMetrics.length, average, trend: 'stable' };
      }

      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg * 1.05 ? 'up' : 
                   secondAvg < firstAvg * 0.95 ? 'down' : 'stable';

      return { count: recentMetrics.length, average, trend };
    }

    // For blood pressure, we'll use systolic for trend
    if (type === 'blood_pressure') {
      const systolicValues = recentMetrics.map(m => {
        const parts = m.value.split('/');
        return parts.length > 0 ? parseFloat(parts[0]) : 0;
      }).filter(val => !isNaN(val));

      if (systolicValues.length === 0) {
        return { count: recentMetrics.length, average: 0, trend: 'stable' };
      }

      const average = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
      
      const midpoint = Math.floor(systolicValues.length / 2);
      const firstHalf = systolicValues.slice(0, midpoint);
      const secondHalf = systolicValues.slice(midpoint);
      
      if (firstHalf.length === 0 || secondHalf.length === 0) {
        return { count: recentMetrics.length, average, trend: 'stable' };
      }

      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg * 1.05 ? 'up' : 
                   secondAvg < firstAvg * 0.95 ? 'down' : 'stable';

      return { count: recentMetrics.length, average, trend };
    }

    return { count: recentMetrics.length, average: 0, trend: 'stable' };
  };

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    addMetric,
    updateMetric,
    deleteMetric,
    getMetricsByType,
    getLatestMetric,
    getMetricStats,
  };
}