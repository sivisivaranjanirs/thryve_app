import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useSubscription } from '@/hooks/useSubscription';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

interface VoiceEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onVoiceDataParsed: (parsedData: Record<string, string>) => void;
}

export function VoiceEntryModal({ visible, onClose, onVoiceDataParsed }: VoiceEntryModalProps) {
  const { getPremiumFeatures } = useSubscription();
  const premiumFeatures = getPremiumFeatures();
  
  // Simplified state management - only track what we need
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const {
    startRecording,
    isRecording: voiceIsRecording,
    isProcessing: voiceIsProcessing,
    error: voiceError,
    clearError,
    resetStates,
  } = useVoiceChat({
    autoPlay: false,
    recordingDuration: 10000, // 10 seconds max
    language: 'en',
  });

  const scaleAnim = new Animated.Value(1);

  // Reset everything when modal opens/closes
  useEffect(() => {
    if (visible) {
      logger.debug('Voice modal opened - resetting states');
      setRecordingState('idle');
      setErrorMessage(null);
      clearError();
      resetStates();
    } else {
      logger.debug('Voice modal closed - cleaning up');
      setRecordingState('idle');
      setErrorMessage(null);
      resetStates();
    }
  }, [visible, clearError, resetStates]);

  // Sync with voice hook states but don't conflict
  useEffect(() => {
    if (voiceIsRecording && recordingState !== 'recording') {
      logger.debug('Voice hook started recording');
      setRecordingState('recording');
    } else if (voiceIsProcessing && recordingState !== 'processing') {
      logger.debug('Voice hook started processing');
      setRecordingState('processing');
    } else if (!voiceIsRecording && !voiceIsProcessing && recordingState !== 'idle' && recordingState !== 'complete') {
      logger.debug('Voice hook finished - returning to idle');
      setRecordingState('idle');
    }
  }, [voiceIsRecording, voiceIsProcessing, recordingState]);

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      logger.error('Voice error detected', { error: voiceError });
      setRecordingState('error');
      setErrorMessage(voiceError);
    }
  }, [voiceError]);

  const parseVoiceTranscriptForMetrics = (transcript: string): Record<string, string> => {
    const text = transcript.toLowerCase();
    const metrics: Record<string, string> = {};

    return Sentry.startSpan(
      {
        op: "ai.parse",
        name: "Parse Voice Transcript for Health Metrics",
      },
      (span) => {
        span.setAttribute("transcript_length", transcript.length);
        logger.debug('Parsing voice transcript for health metrics', { transcript: transcript.substring(0, 100) });

        // Blood pressure patterns
        const bpPatterns = [
          /(?:blood pressure|bp|pressure)\s+(?:is\s+)?(\d{2,3})\s+(?:over|\/)\s+(\d{2,3})/i,
          /(\d{2,3})\s+(?:over|\/)\s+(\d{2,3})/i
        ];
        
        for (const pattern of bpPatterns) {
          const match = text.match(pattern);
          if (match) {
            metrics.blood_pressure = `${match[1]}/${match[2]}`;
            logger.info('Detected blood pressure from voice', { value: metrics.blood_pressure });
            break;
          }
        }

        // Heart rate patterns
        const hrPatterns = [
          /(?:heart rate|pulse|hr)\s+(?:is\s+)?(\d{2,3})/i,
          /(\d{2,3})\s+(?:beats per minute|bpm)/i
        ];
        
        for (const pattern of hrPatterns) {
          const match = text.match(pattern);
          if (match && !metrics.blood_pressure?.includes(match[1])) {
            metrics.heart_rate = match[1];
            logger.info('Detected heart rate from voice', { value: metrics.heart_rate });
            break;
          }
        }

        // Weight patterns
        const weightPatterns = [
          /(?:weight|weigh)\s+(?:is\s+)?(\d{2,3}(?:\.\d+)?)/i,
          /(\d{2,3}(?:\.\d+)?)\s+(?:pounds|lbs|kilograms|kg)/i
        ];
        
        for (const pattern of weightPatterns) {
          const match = text.match(pattern);
          if (match) {
            metrics.weight = match[1];
            logger.info('Detected weight from voice', { value: metrics.weight });
            break;
          }
        }

        // Blood glucose patterns
        const bgPatterns = [
          /(?:blood glucose|blood sugar|glucose|sugar)\s+(?:is\s+)?(\d{2,3})/i,
          /(\d{2,3})\s+(?:mg\/dl|milligrams)/i
        ];
        
        for (const pattern of bgPatterns) {
          const match = text.match(pattern);
          if (match && !Object.values(metrics).includes(match[1])) {
            metrics.blood_glucose = match[1];
            logger.info('Detected blood glucose from voice', { value: metrics.blood_glucose });
            break;
          }
        }

        // Temperature patterns
        const tempPatterns = [
          /(?:temperature|temp)\s+(?:is\s+)?(\d{2,3}(?:\.\d+)?)/i,
          /(\d{2,3}(?:\.\d+)?)\s+(?:degrees|fahrenheit|celsius)/i
        ];
        
        for (const pattern of tempPatterns) {
          const match = text.match(pattern);
          if (match && !Object.values(metrics).includes(match[1])) {
            metrics.temperature = match[1];
            logger.info('Detected temperature from voice', { value: metrics.temperature });
            break;
          }
        }

        const metricsCount = Object.keys(metrics).length;
        span.setAttribute("metrics_detected", metricsCount);
        logger.info('Voice transcript parsing completed', { 
          metricsDetected: metricsCount,
          metrics: Object.keys(metrics)
        });
        
        return metrics;
      }
    );
  };

  const handleMicPress = async () => {
    return Sentry.startSpan(
      {
        op: "ui.voice.entry",
        name: "Voice Health Entry Process",
      },
      async (span) => {
        logger.info('Voice mic button pressed', { currentState: recordingState });

        // Check premium access
        if (!premiumFeatures.voiceEntryForHealthMetrics) {
          span.setAttribute("premium_required", true);
          logger.warn('Voice entry attempted without premium subscription');
          alert('Voice entry requires Premium subscription. Please upgrade to use this feature.');
          return;
        }

        // Prevent multiple recordings
        if (recordingState !== 'idle' && recordingState !== 'error') {
          logger.debug('Recording already in progress, ignoring button press', { currentState: recordingState });
          return;
        }

        // Clear any previous errors and reset states
        setErrorMessage(null);
        clearError();
        resetStates();
        
        // Start recording process
        setRecordingState('recording');
        
        // Animate mic button
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();

        try {
          logger.info('Starting voice health entry recording');
          
          const transcription = await startRecording();
          
          span.setAttribute("transcription_received", !!transcription.text);
          span.setAttribute("transcription_length", transcription.text?.length || 0);
          
          if (transcription.text && transcription.text.trim()) {
            logger.info('Transcription received, processing metrics', { 
              transcript: transcription.text.substring(0, 100) 
            });
            
            setRecordingState('processing');
            
            const parsedMetrics = parseVoiceTranscriptForMetrics(transcription.text);
            
            const metricsCount = Object.keys(parsedMetrics).length;
            span.setAttribute("metrics_parsed", metricsCount);
            
            if (Object.keys(parsedMetrics).length > 0) {
              logger.info('Voice health entry successful', { 
                metricsCount,
                metrics: Object.keys(parsedMetrics)
              });
              
              setRecordingState('complete');
              
              // Small delay to show success state
              setTimeout(() => {
                onClose();
                // Pass data to parent after modal closes
                setTimeout(() => {
                  onVoiceDataParsed(parsedMetrics);
                }, 100);
              }, 1000);
            } else {
              logger.warn('No health metrics detected in voice input', { 
                transcript: transcription.text.substring(0, 100)
              });
              
              setRecordingState('error');
              setErrorMessage(`I heard: "${transcription.text}"\n\nBut I couldn't detect any health metrics. Please try again with phrases like "My blood pressure is 120 over 80" or "Heart rate 72 beats per minute".`);
              
              // Auto-reset to idle after showing error
              setTimeout(() => {
                setRecordingState('idle');
                setErrorMessage(null);
              }, 5000);
            }
          } else {
            logger.warn('No transcription text received from voice input');
            setRecordingState('error');
            setErrorMessage('No speech detected. Please speak clearly and try again.');
            
            // Auto-reset to idle after showing error
            setTimeout(() => {
              setRecordingState('idle');
              setErrorMessage(null);
            }, 3000);
          }
        } catch (error) {
          logger.error('Voice health entry error', { error: error instanceof Error ? error.message : 'Unknown error' });
          Sentry.captureException(error);
          
          setRecordingState('error');
          const errorMsg = error instanceof Error ? error.message : 'Voice recording failed. Please try again.';
          setErrorMessage(errorMsg);
          
          // Auto-reset to idle after showing error
          setTimeout(() => {
            setRecordingState('idle');
            setErrorMessage(null);
          }, 5000);
        }
      }
    );
  };

  const getButtonText = () => {
    switch (recordingState) {
      case 'recording':
        return 'Recording... Speak now';
      case 'processing':
        return 'Processing your speech...';
      case 'complete':
        return 'Success! Opening form...';
      case 'error':
        return 'Error - Tap to try again';
      default:
        return premiumFeatures.voiceEntryForHealthMetrics 
          ? 'Tap to start recording'
          : 'Premium feature - Upgrade to use voice entry';
    }
  };

  const getButtonColor = () => {
    switch (recordingState) {
      case 'recording':
        return '#EF4444'; // Red while recording
      case 'processing':
        return '#F59E0B'; // Orange while processing
      case 'complete':
        return '#10B981'; // Green when complete
      case 'error':
        return '#EF4444'; // Red for error (but clickable)
      default:
        return premiumFeatures.voiceEntryForHealthMetrics ? '#10B981' : '#9CA3AF';
    }
  };

  const isButtonDisabled = () => {
    // Only disable for non-premium users or during processing/complete states
    return !premiumFeatures.voiceEntryForHealthMetrics || 
           recordingState === 'processing' || 
           recordingState === 'complete';
  };

  const getCurrentError = () => {
    return errorMessage || voiceError;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Voice Health Entry</Text>
          
          <Animated.View style={[styles.micContainer, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: getButtonColor() },
                isButtonDisabled() && styles.micButtonDisabled
              ]}
              onPress={handleMicPress}
              disabled={isButtonDisabled()}
            >
              {recordingState === 'recording' ? (
                <MicOff size={32} color="#ffffff" />
              ) : (
                <Mic size={32} color="#ffffff" />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.instruction}>
            {getButtonText()}
          </Text>

          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Say your health readings like:</Text>
            <Text style={styles.example}>"My blood pressure is 120 over 80"</Text>
            <Text style={styles.example}>"Heart rate 72 beats per minute"</Text>
            <Text style={styles.example}>"Weight 150 pounds"</Text>
            <Text style={styles.example}>"Blood sugar 100"</Text>
            <Text style={styles.example}>"Temperature 98.6 degrees"</Text>
          </View>

          {!premiumFeatures.voiceEntryForHealthMetrics && (
            <View style={styles.premiumNotice}>
              <Text style={styles.premiumText}>
                🔒 Voice entry requires Premium subscription. Upgrade to unlock unlimited voice features with high-quality speech recognition.
              </Text>
            </View>
          )}

          {getCurrentError() && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{getCurrentError()}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 32,
  },
  micContainer: {
    marginBottom: 24,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 32,
    textAlign: 'center',
  },
  examplesContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  examplesTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  example: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  premiumNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  premiumText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
    minWidth: 120,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});