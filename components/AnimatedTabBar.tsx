import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const tabWidth = screenWidth / state.routes.length;
  const translateX = useSharedValue(state.index * tabWidth);

  React.useEffect(() => {
    translateX.value = withSpring(state.index * tabWidth, {
      damping: 20,
      stiffness: 300,
    });
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, { width: tabWidth }, indicatorStyle]} />
      
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabButton
            key={route.key}
            label={label as string}
            icon={options.tabBarIcon}
            isFocused={isFocused}
            onPress={onPress}
            index={index}
          />
        );
      })}
    </View>
  );
}

interface TabButtonProps {
  label: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  isFocused: boolean;
  onPress: () => void;
  index: number;
}

function TabButton({ label, icon, isFocused, onPress, index }: TabButtonProps) {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      iconScale.value = withSpring(1.1, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      onPress();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      iconScale.value,
      [1, 1.1],
      [0, -2],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { scale: iconScale.value },
        { translateY },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      iconScale.value,
      [1, 1.1],
      [isFocused ? 1 : 0.6, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.tabButton, animatedStyle]}>
        <Animated.View style={iconAnimatedStyle}>
          {icon && icon({
            focused: isFocused,
            color: isFocused ? '#3B82F6' : '#9CA3AF',
            size: 24,
          })}
        </Animated.View>
        <Animated.Text style={[
          styles.tabLabel,
          { color: isFocused ? '#3B82F6' : '#9CA3AF' },
          textAnimatedStyle,
        ]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    height: 70,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});