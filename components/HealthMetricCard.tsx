import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface HealthMetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend?: React.ReactNode;
  trendColor?: string;
  date?: string;
  style?: ViewStyle;
}

export function HealthMetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendColor,
  date,
  style,
}: HealthMetricCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            {trend}
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      
      {date && (
        <Text style={styles.date}>{formatDate(date)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 6,
  },
  date: {
    fontSize: 9,
    color: '#9CA3AF',
  },
});