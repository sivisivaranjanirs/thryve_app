import React, { useState } from 'react';
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    startRecording,
    isRecording: voiceIsRecording,
    isProcessing: voiceIsProcessing,
  } = useVoiceChat({
    autoPlay: false,
    recordingDuration: 10000, // 10 seconds max
    language: 'en',
  });

  const scaleAnim = new Animated.Value(1);

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
    if (!premiumFeatures.voiceEntryForHealthMetrics) {
        span.setAttribute("premium_required", true);
        logger.warn('Voice entry attempted without premium subscription');
      alert('Voice entry requires Premium subscription. Please upgrade to use this feature.');
      return;
    }

    if (isRecording || voiceIsRecording) {
        logger.debug('Recording already in progress');
      // Stop recording - this will be handled by the hook
      return;
    }

    // Start recording
    setIsRecording(true);
    
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
        const parsedMetrics = parseVoiceTranscriptForMetrics(transcription.text);
          
          const metricsCount = Object.keys(parsedMetrics).length;
          span.setAttribute("metrics_parsed", metricsCount);
        
        if (Object.keys(parsedMetrics).length > 0) {
            logger.info('Voice health entry successful', { 
              metricsCount,
              metrics: Object.keys(parsedMetrics)
            });
          // Close this modal and pass data to parent
          onClose();
          // Add a small delay to ensure modal closes before opening the next one
          setTimeout(() => {
            onVoiceDataParsed(parsedMetrics);
          }, 100);
        } else {
            logger.warn('No health metrics detected in voice input', { 
              transcript: transcription.text.substring(0, 100)
            });
          // Show user feedback that no metrics were detected
          alert(`I heard: "${transcription.text}"\n\nBut I couldn't detect any health metrics. Please try again and speak clearly about your health readings like:\n• "My blood pressure is 120 over 80"\n• "Heart rate 72 beats per minute"\n• "I weigh 150 pounds"`);
        }
      } else {
          logger.warn('No transcription text received from voice input');
        alert('No speech detected. Please speak clearly and try again.');
      }
    } catch (error) {
        logger.error('Voice health entry error', { error: error instanceof Error ? error.message : 'Unknown error' });
        Sentry.captureException(error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Voice recording failed. Please try again.';
      alert(errorMessage);
    } finally {
      setIsRecording(false);
    }
      }
    );
  };

  const currentlyRecording = isRecording || voiceIsRecording;
  const currentlyProcessing = voiceIsProcessing;

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
                currentlyRecording && styles.micButtonRecording,
                !premiumFeatures.voiceEntryForHealthMetrics && styles.micButtonDisabled
              ]}
              onPress={handleMicPress}
              disabled={!premiumFeatures.voiceEntryForHealthMetrics || currentlyProcessing}
            >
              {currentlyRecording ? (
                <MicOff size={32} color="#ffffff" />
              ) : (
                <Mic size={32} color="#ffffff" />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.instruction}>
            {currentlyRecording 
              ? 'Recording...' 
              : currentlyProcessing
              ? 'Processing...'
              : premiumFeatures.voiceEntryForHealthMetrics 
                ? 'Tap to start recording'
                : 'Premium feature - Upgrade to use voice entry'
            }
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
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
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