import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  scrollY?: Animated.SharedValue<number>;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  scrollY,
  rightComponent,
  leftComponent,
}: AppHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };
    
    const opacity = interpolate(
      scrollY.value,
      [0, 50, 100],
      [1, 1, 1],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  return (
    <View style={styles.headerContainer}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.content}>
            {leftComponent && (
              <View style={styles.leftSection}>
                {leftComponent}
              </View>
            )}
            
            {(title || subtitle) && (
              <View style={styles.titleSection}>
                {title && (
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}
            
            {rightComponent && (
              <View style={styles.rightSection}>
                {rightComponent}
              </View>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  safeArea: {
    backgroundColor: '#ffffff',
  },
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 50,
  },
  leftSection: {
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  rightSection: {
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});