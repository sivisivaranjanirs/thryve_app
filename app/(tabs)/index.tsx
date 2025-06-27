import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  MessageSquare, 
  Activity, 
  Heart,
  Droplets,
  Thermometer,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useHealthMetrics } from '@/hooks/useHealthMetrics';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HealthMetricCard } from '@/components/HealthMetricCard';
import { AppHeader } from '@/components/AppHeader';
import { DebugPanel } from '@/components/DebugPanel';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const { metrics, loading, fetchMetrics, getLatestMetric, getMetricStats } = useHealthMetrics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={14} color="#EF4444" />;
      case 'down':
        return <TrendingDown size={14} color="#10B981" />;
      default:
        return <Minus size={14} color="#9CA3AF" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return '#EF4444';
      case 'down':
        return '#10B981';
      default:
        return '#9CA3AF';
    }
  };

  const latestBP = getLatestMetric('blood_pressure');
  const latestGlucose = getLatestMetric('blood_glucose');
  const latestHeartRate = getLatestMetric('heart_rate');
  const latestTemp = getLatestMetric('temperature');
  const latestWeight = getLatestMetric('weight');

  const bpStats = getMetricStats('blood_pressure');
  const glucoseStats = getMetricStats('blood_glucose');
  const heartRateStats = getMetricStats('heart_rate');
  const tempStats = getMetricStats('temperature');
  const weightStats = getMetricStats('weight');

  if (loading && metrics.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader scrollY={scrollY} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader scrollY={scrollY} />
      <DebugPanel />
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 74 }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchMetrics} />
        }
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            {getTimeGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}
          </Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <MessageSquare size={20} color="#ffffff" />
            <Text style={styles.primaryActionText}>Talk to me</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={() => router.push('/(tabs)/health')}
          >
            <Plus size={20} color="#3B82F6" />
            <Text style={styles.secondaryActionText}>Add Reading</Text>
          </TouchableOpacity>
        </View>

        {/* Health Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          
          <View style={styles.metricsGrid}>
            <HealthMetricCard
              title="Blood Pressure"
              value={latestBP?.value || '--'}
              unit={latestBP?.unit || 'mmHg'}
              icon={<Heart size={18} color="#EF4444" />}
              trend={getTrendIcon(bpStats.trend)}
              trendColor={getTrendColor(bpStats.trend)}
              date={latestBP?.recorded_at}
              style={styles.metricCard}
            />
            
            <HealthMetricCard
              title="Heart Rate"
              value={latestHeartRate?.value || '--'}
              unit={latestHeartRate?.unit || 'bpm'}
              icon={<Heart size={18} color="#F59E0B" />}
              trend={getTrendIcon(heartRateStats.trend)}
              trendColor={getTrendColor(heartRateStats.trend)}
              date={latestHeartRate?.recorded_at}
              style={styles.metricCard}
            />
            
            <HealthMetricCard
              title="Blood Glucose"
              value={latestGlucose?.value || '--'}
              unit={latestGlucose?.unit || 'mg/dL'}
              icon={<Droplets size={18} color="#3B82F6" />}
              trend={getTrendIcon(glucoseStats.trend)}
              trendColor={getTrendColor(glucoseStats.trend)}
              date={latestGlucose?.recorded_at}
              style={styles.metricCard}
            />
            
            <HealthMetricCard
              title="Weight"
              value={latestWeight?.value || '--'}
              unit={latestWeight?.unit || 'lbs'}
              icon={<Scale size={18} color="#8B5CF6" />}
              trend={getTrendIcon(weightStats.trend)}
              trendColor={getTrendColor(weightStats.trend)}
              date={latestWeight?.recorded_at}
              style={styles.metricCard}
            />
          </View>
        </View>

        {/* Recent Activity */}
        {metrics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/health')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {metrics.slice(0, 3).map((metric) => (
              <View key={metric.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  {metric.metric_type === 'blood_pressure' && <Heart size={14} color="#EF4444" />}
                  {metric.metric_type === 'blood_glucose' && <Droplets size={14} color="#3B82F6" />}
                  {metric.metric_type === 'heart_rate' && <Heart size={14} color="#F59E0B" />}
                  {metric.metric_type === 'temperature' && <Thermometer size={14} color="#F97316" />}
                  {metric.metric_type === 'weight' && <Scale size={14} color="#8B5CF6" />}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    {metric.metric_type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.activityValue}>
                    {metric.value} {metric.unit}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(metric.recorded_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {metrics.length === 0 && (
          <View style={styles.emptyState}>
            <Activity size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>Start Your Health Journey</Text>
            <Text style={styles.emptyStateText}>
              Begin tracking your health metrics to see insights and trends
            </Text>
            <TouchableOpacity 
              style={styles.getStartedButton}
              onPress={() => router.push('/(tabs)/health')}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.getStartedText}>Add First Reading</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80, // Account for header
    paddingBottom: 100,
  },
  greetingSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 20,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 24,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 10,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  metricCard: {
    width: '46%',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 280,
    lineHeight: 22,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});