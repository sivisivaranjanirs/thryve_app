import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { elevenLabs, TranscriptionResult } from '@/lib/elevenlabs';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export interface VoiceChatOptions {
  autoPlay?: boolean;
  recordingDuration?: number;
  voiceId?: string;
  language?: string;
}

export function useVoiceChat(options: VoiceChatOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    autoPlay = true,
    recordingDuration = 5000,
    voiceId = 'pNInz6obpgDQGcFmaJgB',
    language = 'en',
  } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    try {
      return Sentry.startSpan(
        {
          op: "ui.voice.speak",
          name: "Voice Chat Speak Text",
        },
        async (span) => {
          span.setAttribute("text_length", text.length);
          span.setAttribute("voice_id", voiceId);
          
      setIsProcessing(true);
      setError(null);

      setIsPlaying(true);
      await elevenLabs.textToSpeech(text, {
        voice_id: voiceId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true,
        },
      });
      setIsPlaying(false);
        }
      );
    } catch (err) {
      logger.error('Voice chat speak error', { error: err instanceof Error ? err.message : 'Unknown error' });
      Sentry.captureException(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsPlaying(false);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [voiceId, autoPlay]);

  const startRecording = useCallback(async (): Promise<TranscriptionResult> => {
    try {
      return Sentry.startSpan(
        {
          op: "ui.voice.record",
          name: "Voice Chat Recording",
        },
        async (span) => {
          span.setAttribute("duration_ms", recordingDuration);
          span.setAttribute("language", language);
          
          logger.info('Starting voice recording', { duration: recordingDuration, language });
      setIsRecording(true);
      setRecordingProgress(recordingDuration);
      setError(null);
      setIsProcessing(false);

      // Start progress countdown
      const progressInterval = setInterval(() => {
        setRecordingProgress(prev => {
          const newProgress = prev - 100;
          if (newProgress <= 0) {
            clearInterval(progressInterval);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      const transcription = await elevenLabs.speechToText({
        language,
        recordingDuration,
        timestamp_granularities: ['segment'],
        response_format: 'json',
      });

          logger.info('Voice recording transcription received', { 
            textLength: transcription.text?.length || 0,
            hasText: !!transcription.text?.trim()
          });
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Validate transcription result
      if (!transcription || typeof transcription.text !== 'string') {
        throw new Error('Invalid transcription result received');
      }
      
      if (!transcription.text.trim()) {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }
      
          span.setAttribute("transcription_length", transcription.text.length);
      return transcription;
        }
      );
    } catch (err) {
      logger.error('Voice recording error', { error: err instanceof Error ? err.message : 'Unknown error' });
      Sentry.captureException(err);
      
      let errorMessage = 'Failed to record or transcribe audio';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsRecording(false);
      setRecordingProgress(0);
      setIsProcessing(false);
    }
  }, [recordingDuration, language]);

  const transcribeAudio = useCallback(async (audioFile: File): Promise<TranscriptionResult> => {
    try {
      return Sentry.startSpan(
        {
          op: "ai.transcribe",
          name: "Audio File Transcription",
        },
        async (span) => {
          span.setAttribute("file_size", audioFile.size);
          span.setAttribute("file_type", audioFile.type);
          
      setIsProcessing(true);
      setError(null);

      const transcription = await elevenLabs.speechToTextFromFile(audioFile, {
        language,
        timestamp_granularities: ['segment'],
        response_format: 'json',
      });

      return transcription;
        }
      );
    } catch (err) {
      logger.error('Audio transcription error', { error: err instanceof Error ? err.message : 'Unknown error' });
      Sentry.captureException(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to transcribe audio';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [language]);

  const stopPlaying = useCallback(() => {
    elevenLabs.stopSpeech();
    setIsPlaying(false);
    logger.debug('Voice playback stopped');
  }, []);

  return {
    // State
    isRecording,
    isPlaying,
    isProcessing,
    recordingProgress,
    error,
    
    // Actions
    speakText,
    startRecording,
    transcribeAudio,
    stopPlaying,
    clearError,
    
    // Computed
    isActive: isRecording || isPlaying || isProcessing,
  };
}