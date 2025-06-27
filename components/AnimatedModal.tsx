import React, { useEffect } from 'react';
import { Modal, ModalProps, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedModalProps extends Omit<ModalProps, 'animationType'> {
  children: React.ReactNode;
  visible: boolean;
  onRequestClose: () => void;
  animationType?: 'slide' | 'fade' | 'scale';
}

export function AnimatedModal({
  children,
  visible,
  onRequestClose,
  animationType = 'slide',
  ...props
}: AnimatedModalProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(animationType === 'slide' ? 300 : 0);
  const scale = useSharedValue(animationType === 'scale' ? 0.8 : 1);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      
      if (animationType === 'slide') {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      } else if (animationType === 'scale') {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      
      if (animationType === 'slide') {
        translateY.value = withTiming(300, { duration: 200 });
      } else if (animationType === 'scale') {
        scale.value = withTiming(0.8, { duration: 200 });
      }
    }
  }, [visible, animationType]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
      {...props}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]} />
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: '90%',
    maxHeight: '80%',
  },
});