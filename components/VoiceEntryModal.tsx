import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Mic, MicOff, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useSubscription } from '@/hooks/useSubscription';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

interface VoiceEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onVoiceDataParsed: (parsedData: Record<string, string>) => void;
}

type VoiceState = 'idle' | 'requesting_permission' | 'recording' | 'processing' | 'success' | 'error';

export function VoiceEntryModal({ visible, onClose, onVoiceDataParsed }: VoiceEntryModalProps) {
  const { getPremiumFeatures } = useSubscription();
  const premiumFeatures = getPremiumFeatures();
  
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const scaleAnim = new Animated.Value(1);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add debug logging
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setDebugInfo(prev => [...prev.slice(-4), logMessage]);
    logger.debug('Voice Entry Debug', { message });
  };

  // Cleanup function
  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    setRecordingTime(0);
  };

  // Reset everything when modal opens/closes
  useEffect(() => {
    if (visible) {
      addDebugInfo('Modal opened - resetting states');
      setVoiceState('idle');
      setErrorMessage(null);
      setDebugInfo([]);
      setRecordingTime(0);
    } else {
      addDebugInfo('Modal closed - cleaning up');
      cleanup();
      setVoiceState('idle');
      setErrorMessage(null);
    }
    
    return cleanup;
  }, [visible]);

  const parseVoiceTranscriptForMetrics = (transcript: string): Record<string, string> => {
    addDebugInfo(`Parsing transcript: "${transcript.substring(0, 50)}..."`);
    
    const text = transcript.toLowerCase();
    const metrics: Record<string, string> = {};

    // Blood pressure patterns
    const bpPatterns = [
      /(?:blood pressure|bp|pressure)\s+(?:is\s+)?(\d{2,3})\s+(?:over|\/)\s+(\d{2,3})/i,
      /(\d{2,3})\s+(?:over|\/)\s+(\d{2,3})/i
    ];
    
    for (const pattern of bpPatterns) {
      const match = text.match(pattern);
      if (match) {
        metrics.blood_pressure = `${match[1]}/${match[2]}`;
        addDebugInfo(`Found blood pressure: ${metrics.blood_pressure}`);
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
        addDebugInfo(`Found heart rate: ${metrics.heart_rate}`);
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
        addDebugInfo(`Found weight: ${metrics.weight}`);
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
        addDebugInfo(`Found blood glucose: ${metrics.blood_glucose}`);
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
        addDebugInfo(`Found temperature: ${metrics.temperature}`);
        break;
      }
    }

    const metricsCount = Object.keys(metrics).length;
    addDebugInfo(`Parsing complete: ${metricsCount} metrics found`);
    
    return metrics;
  };

  const handleMicPress = async () => {
    addDebugInfo('Mic button pressed');

    // Check premium access
    if (!premiumFeatures.voiceEntryForHealthMetrics) {
      addDebugInfo('Premium required - showing alert');
      alert('Voice entry requires Premium subscription. Please upgrade to use this feature.');
      return;
    }

    // Handle different states
    if (voiceState === 'recording') {
      addDebugInfo('Stopping recording manually');
      stopRecording();
      return;
    }

    // Prevent multiple recordings
    if (voiceState !== 'idle' && voiceState !== 'error') {
      addDebugInfo(`Recording blocked - current state: ${voiceState}`);
      return;
    }

    // Start recording process
    await startRecording();
  };

  const startRecording = async () => {
    try {
      // Clear previous errors
      setErrorMessage(null);
      setVoiceState('requesting_permission');
      addDebugInfo('Requesting microphone permission');
      
      // Check browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }

      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addDebugInfo('Microphone permission granted');
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());

      // Now start speech recognition
      setVoiceState('recording');
      addDebugInfo('Starting speech recognition');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      // Start recording timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Set maximum recording time (10 seconds)
      recordingTimeoutRef.current = setTimeout(() => {
        addDebugInfo('Recording timeout - stopping');
        stopRecording();
      }, 10000);

      recognition.onstart = () => {
        addDebugInfo('Speech recognition started successfully');
        
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
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        addDebugInfo(`Recognition result: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
        
        setVoiceState('processing');
        cleanup();
        
        if (transcript && transcript.trim()) {
          const parsedMetrics = parseVoiceTranscriptForMetrics(transcript);
          
          if (Object.keys(parsedMetrics).length > 0) {
            addDebugInfo('Metrics found - showing success');
            setVoiceState('success');
            
            // Show success for a moment, then close and pass data
            setTimeout(() => {
              addDebugInfo('Closing modal and passing data');
              onVoiceDataParsed(parsedMetrics);
            }, 1500);
          } else {
            addDebugInfo('No metrics detected in transcript');
            setVoiceState('error');
            setErrorMessage(`I heard: "${transcript}"\n\nBut I couldn't detect any health metrics. Please try phrases like "My blood pressure is 120 over 80" or "Heart rate 72 beats per minute".`);
            
            // Auto-reset after error
            setTimeout(() => {
              setVoiceState('idle');
              setErrorMessage(null);
            }, 5000);
          }
        } else {
          addDebugInfo('Empty transcript received');
          setVoiceState('error');
          setErrorMessage('No speech detected. Please speak clearly and try again.');
          
          setTimeout(() => {
            setVoiceState('idle');
            setErrorMessage(null);
          }, 3000);
        }
      };

      recognition.onerror = (event) => {
        addDebugInfo(`Recognition error: ${event.error}`);
        cleanup();
        
        setVoiceState('error');
        let errorMsg = 'Speech recognition failed. Please try again.';
        
        switch (event.error) {
          case 'no-speech':
            errorMsg = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMsg = 'Microphone not accessible. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMsg = 'Microphone access denied. Please allow microphone permissions.';
            break;
          case 'network':
            errorMsg = 'Network error. Please check your internet connection.';
            break;
          case 'aborted':
            // Don't show error for manual abort
            setVoiceState('idle');
            return;
        }
        
        setErrorMessage(errorMsg);
        
        // Auto-reset after error
        setTimeout(() => {
          setVoiceState('idle');
          setErrorMessage(null);
        }, 4000);
      };

      recognition.onend = () => {
        addDebugInfo('Speech recognition ended');
        if (voiceState === 'recording') {
          // If we're still in recording state, it ended unexpectedly
          setVoiceState('processing');
        }
      };

      // Start recognition
      recognition.start();
      
    } catch (error) {
      addDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Sentry.captureException(error);
      
      cleanup();
      setVoiceState('error');
      
      let errorMsg = 'Voice recording failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('denied') || error.message.includes('NotAllowedError')) {
          errorMsg = 'Microphone access denied. Please allow microphone permissions and try again.';
        } else if (error.message.includes('NotFoundError')) {
          errorMsg = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.message.includes('not supported')) {
          errorMsg = 'Voice recording is not supported in this browser. Please use Chrome, Edge, or Safari.';
        } else {
          errorMsg = error.message;
        }
      }
      
      setErrorMessage(errorMsg);
      
      // Auto-reset after error
      setTimeout(() => {
        setVoiceState('idle');
        setErrorMessage(null);
      }, 5000);
    }
  };

  const stopRecording = () => {
    addDebugInfo('Stopping recording');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        addDebugInfo('Error stopping recognition');
      }
    }
    
    cleanup();
    setVoiceState('idle');
  };

  const getButtonText = () => {
    switch (voiceState) {
      case 'requesting_permission':
        return 'Requesting microphone access...';
      case 'recording':
        return `Listening... (${recordingTime}s) - Tap to stop`;
      case 'processing':
        return 'Processing your speech...';
      case 'success':
        return 'Success! Opening form...';
      case 'error':
        return 'Error - Tap to try again';
      default:
        return premiumFeatures.voiceEntryForHealthMetrics 
          ? 'Tap to start recording'
          : 'Premium feature - Upgrade required';
    }
  };

  const getButtonColor = () => {
    switch (voiceState) {
      case 'requesting_permission':
        return '#F59E0B'; // Orange for permission
      case 'recording':
        return '#EF4444'; // Red while recording
      case 'processing':
        return '#F59E0B'; // Orange while processing
      case 'success':
        return '#10B981'; // Green when complete
      case 'error':
        return '#EF4444'; // Red for error
      default:
        return premiumFeatures.voiceEntryForHealthMetrics ? '#10B981' : '#9CA3AF';
    }
  };

  const isButtonDisabled = () => {
    return !premiumFeatures.voiceEntryForHealthMetrics || 
           voiceState === 'processing' || 
           voiceState === 'success' ||
           voiceState === 'requesting_permission';
  };

  const getButtonIcon = () => {
    if (voiceState === 'success') {
      return <CheckCircle size={32} color="#ffffff" />;
    } else if (voiceState === 'recording') {
      return <MicOff size={32} color="#ffffff" />;
    } else {
      return <Mic size={32} color="#ffffff" />;
    }
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
              {getButtonIcon()}
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
                🔒 Voice entry requires Premium subscription. Upgrade to unlock unlimited voice features.
              </Text>
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Debug Information */}
          {debugInfo.length > 0 && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              {debugInfo.map((info, index) => (
                <Text key={index} style={styles.debugText}>{info}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
            disabled={voiceState === 'success'}
          >
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
    maxHeight: '90%',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 32,
    textAlign: 'center',
    minHeight: 40,
  },
  examplesContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  premiumText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  debugContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxHeight: 120,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
    fontFamily: 'monospace',
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