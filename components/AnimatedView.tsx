import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface AnimatedViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  duration?: number;
  type?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'spring';
  distance?: number;
}

export function AnimatedView({
  children,
  style,
  delay = 0,
  duration = 300,
  type = 'fade',
  distance = 50,
}: AnimatedViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(type === 'slideUp' ? distance : type === 'slideDown' ? -distance : 0);
  const translateX = useSharedValue(type === 'slideLeft' ? distance : type === 'slideRight' ? -distance : 0);
  const scale = useSharedValue(type === 'scale' ? 0.8 : 1);

  useEffect(() => {
    const config = type === 'spring' 
      ? { damping: 15, stiffness: 150 }
      : { duration, easing: Easing.out(Easing.cubic) };

    if (delay > 0) {
      opacity.value = withDelay(delay, withTiming(1, config));
      translateY.value = withDelay(delay, type === 'spring' ? withSpring(0) : withTiming(0, config));
      translateX.value = withDelay(delay, type === 'spring' ? withSpring(0) : withTiming(0, config));
      scale.value = withDelay(delay, type === 'spring' ? withSpring(1) : withTiming(1, config));
    } else {
      opacity.value = withTiming(1, config);
      translateY.value = type === 'spring' ? withSpring(0) : withTiming(0, config);
      translateX.value = type === 'spring' ? withSpring(0) : withTiming(0, config);
      scale.value = type === 'spring' ? withSpring(1) : withTiming(1, config);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  itemDelay?: number;
  type?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'spring';
}

export function StaggeredList({
  children,
  staggerDelay = 100,
  itemDelay = 0,
  type = 'slideUp',
}: StaggeredListProps) {
  return (
    <>
      {children.map((child, index) => (
        <AnimatedView
          key={index}
          delay={itemDelay + index * staggerDelay}
          type={type}
        >
          {child}
        </AnimatedView>
      ))}
    </>
  );
}

interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scale?: number;
  duration?: number;
}

export function PulseView({ children, style, scale = 1.05, duration = 1000 }: PulseViewProps) {
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    const animate = () => {
      scaleValue.value = withTiming(scale, { duration: duration / 2 }, () => {
        scaleValue.value = withTiming(1, { duration: duration / 2 }, animate);
      });
    };
    animate();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}