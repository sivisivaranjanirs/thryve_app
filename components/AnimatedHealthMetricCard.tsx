import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface AnimatedHealthMetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend?: React.ReactNode;
  trendColor?: string;
  date?: string;
  style?: ViewStyle;
  delay?: number;
  onPress?: () => void;
}

export function AnimatedHealthMetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendColor,
  date,
  style,
  delay = 0,
  onPress,
}: AnimatedHealthMetricCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 }, () => {
      // Add a subtle bounce after appearing
      scale.value = withSpring(1.02, { damping: 15, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      });
    });
    translateY.value = withTiming(0, { duration: 600 });
  }, []);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      if (onPress) {
        pressed.value = true;
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      }
    })
    .onFinalize(() => {
      if (onPress) {
        pressed.value = false;
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }
    })
    .onEnd(() => {
      if (onPress) {
        onPress();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scale.value,
      [0.95, 1],
      [0.1, 0.04],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      shadowOpacity,
    };
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  const CardContent = (
    <Animated.View style={[styles.container, animatedStyle, style]}>
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
    </Animated.View>
  );

  if (onPress) {
    return (
      <GestureDetector gesture={gesture}>
        {CardContent}
      </GestureDetector>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    marginBottom: 16,
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