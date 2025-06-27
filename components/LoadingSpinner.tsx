import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  type?: 'default' | 'pulse' | 'dots' | 'skeleton';
}

export function LoadingSpinner({ size = 'large', color = '#14B8A6', type = 'default' }: LoadingSpinnerProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (type === 'default') {
    return (
      <Animated.View style={[styles.container, containerStyle]}>
        <ActivityIndicator size={size} color={color} />
      </Animated.View>
    );
  }

  if (type === 'pulse') {
    return <PulseLoader color={color} />;
  }

  if (type === 'dots') {
    return <DotsLoader color={color} />;
  }

  if (type === 'skeleton') {
    return <SkeletonLoader />;
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <ActivityIndicator size={size} color={color} />
    </Animated.View>
  );
}

function PulseLoader({ color }: { color: string }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

function DotsLoader({ color }: { color: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animateDot = (dot: Animated.SharedValue<number>, delay: number) => {
      dot.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-10, { duration: 400, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View style={[styles.container, styles.dotsContainer]}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot1Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot2Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot3Style]} />
    </View>
  );
}

function SkeletonLoader() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonLine, styles.skeletonTitle, animatedStyle]} />
      <Animated.View style={[styles.skeletonLine, styles.skeletonText, animatedStyle]} />
      <Animated.View style={[styles.skeletonLine, styles.skeletonText, animatedStyle]} />
      <Animated.View style={[styles.skeletonLine, styles.skeletonTextShort, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skeletonContainer: {
    padding: 20,
    width: '100%',
  },
  skeletonLine: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 24,
    width: '60%',
  },
  skeletonText: {
    height: 16,
    width: '100%',
  },
  skeletonTextShort: {
    height: 16,
    width: '70%',
  },
});