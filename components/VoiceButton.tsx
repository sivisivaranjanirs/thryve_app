import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View, Text } from 'react-native';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  interpolate,
  useAnimatedProps
} from 'react-native-reanimated';
import { LoadingSpinner } from './LoadingSpinner';

// Create animated version of Circle for proper SVG animation
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

interface VoiceButtonProps {
  isRecording?: boolean;
  isSpeaking?: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  style?: ViewStyle;
  variant?: 'record' | 'speak';
  isProcessing?: boolean;
  recordingProgress?: number;
  showProgress?: boolean;
}

export function VoiceButton({
  isRecording = false,
  isSpeaking = false,
  onPress,
  disabled = false,
  size = 20,
  style,
  variant = 'record',
  isProcessing = false,
  recordingProgress = 0,
  showProgress = false,
}: VoiceButtonProps) {
  const pulseAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);

  React.useEffect(() => {
    if (isRecording) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulseAnimation.value = withTiming(0, { duration: 300 });
    }
  }, [isRecording]);

  React.useEffect(() => {
    if (showProgress && recordingProgress > 0) {
      const progress = Math.max(0, 1 - (recordingProgress / 5000)); // Assuming 5 second max
      progressAnimation.value = withTiming(progress, { duration: 100 });
    } else {
      progressAnimation.value = withTiming(0, { duration: 300 });
    }
  }, [recordingProgress, showProgress]);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.2]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 0.8]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const progressProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      progressAnimation.value,
      [0, 1],
      [126, 0] // Circumference of circle with radius 20
    );
    
    return {
      strokeDashoffset,
    };
  });

  const getIcon = () => {
    if (isProcessing) {
      return <LoadingSpinner size="small" color="#3B82F6" />;
    }
    
    if (variant === 'speak') {
      return isSpeaking ? (
        <VolumeX size={size} color="#ffffff" />
      ) : (
        <Volume2 size={size} color="#3B82F6" />
      );
    }

    return isRecording ? (
      <MicOff size={size} color="#ffffff" />
    ) : (
      <Mic size={size} color="#3B82F6" />
    );
  };

  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      disabled && styles.disabledButton,
      style,
    ];
    
    if (variant === 'speak') {
      return [
        ...baseStyle,
        isSpeaking ? styles.speakingButton : styles.defaultButton,
      ];
    }

    return [
      ...baseStyle,
      isRecording ? styles.recordingButton : styles.defaultButton,
    ];
  };

  return (
    <View style={[styles.container, style]}>
      {isRecording && (
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
      )}
      
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {getIcon()}
      </TouchableOpacity>

      {showProgress && recordingProgress > 0 && (
        <View style={styles.progressContainer}>
          <Svg width="52" height="52" style={styles.progressSvg}>
            <Circle
              cx="26"
              cy="26"
              r="20"
              stroke="#E5E7EB"
              strokeWidth="3"
              fill="transparent"
            />
            <AnimatedCircle
              cx="26"
              cy="26"
              r="20"
              stroke="#3B82F6"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray="126"
              strokeLinecap="round"
              animatedProps={progressProps}
            />
            <SvgText
              x="26"
              y="30"
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="10"
              fontWeight="600"
              fill="#3B82F6"
            >
              {`${Math.ceil(recordingProgress / 1000)}s`}
            </SvgText>
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },
  speakingButton: {
    backgroundColor: '#F59E0B',
    borderWidth: 0,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    zIndex: -1,
  },
  progressContainer: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  progressSvg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
});