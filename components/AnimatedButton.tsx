import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressScale?: number;
  hapticFeedback?: boolean;
  springConfig?: {
    damping?: number;
    stiffness?: number;
  };
}

export function AnimatedButton({
  children,
  style,
  pressScale = 0.95,
  hapticFeedback = true,
  springConfig = { damping: 15, stiffness: 400 },
  onPress,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const triggerHaptic = () => {
    if (hapticFeedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const gesture = Gesture.Tap()
    .onBegin(() => {
      if (!disabled) {
        scale.value = withSpring(pressScale, springConfig);
        opacity.value = withTiming(0.8, { duration: 100 });
        runOnJS(triggerHaptic)();
      }
    })
    .onFinalize(() => {
      if (!disabled) {
        scale.value = withSpring(1, springConfig);
        opacity.value = withTiming(1, { duration: 100 });
      }
    })
    .onEnd(() => {
      if (!disabled && onPress) {
        runOnJS(onPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedTouchableOpacity
        style={[animatedStyle, style]}
        disabled={disabled}
        {...props}
      >
        {children}
      </AnimatedTouchableOpacity>
    </GestureDetector>
  );
}

interface FloatingActionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  backgroundColor?: string;
  shadowColor?: string;
}

export function FloatingActionButton({
  onPress,
  children,
  style,
  size = 56,
  backgroundColor = '#3B82F6',
  shadowColor = '#3B82F6',
}: FloatingActionButtonProps) {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.3);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withTiming(0.5, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowOpacity.value = withTiming(0.3, { duration: 200 });
    })
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 8,
          },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}