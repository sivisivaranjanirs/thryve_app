import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { elevenLabs } from '@/lib/elevenlabs';

export interface UseVoiceOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechError?: (error: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
}

export function useVoice(options?: UseVoiceOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsSpeaking(true);
    setError(null);
    options?.onSpeechStart?.();

    try {
      await elevenLabs.textToSpeech({
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech synthesis failed';
      setError(errorMessage);
      options?.onSpeechError?.(errorMessage);
    } finally {
      setIsSpeaking(false);
      options?.onSpeechEnd?.();
    }
  }, [options]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    setIsRecording(true);
    setIsLoading(true);
    setError(null);

    try {
      const transcript = await elevenLabs.speechToText({
        language: 'en-US',
      });

      if (transcript) {
        options?.onTranscriptReceived?.(transcript);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech recognition failed';
      setError(errorMessage);
      options?.onSpeechError?.(errorMessage);
    } finally {
      setIsRecording(false);
      setIsLoading(false);
    }
  }, [isRecording, options]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setIsLoading(false);
  }, []);

  const stopSpeaking = useCallback(async () => {
    try {
      await elevenLabs.stopSpeech();
      setIsSpeaking(false);
      options?.onSpeechEnd?.();
    } catch (err) {
      console.error('Error stopping speech:', err);
    }
  }, [options]);

  const isVoiceAvailable = useCallback(() => {
    return elevenLabs.isSpeechAvailable();
  }, []);

  return {
    // State
    isRecording,
    isSpeaking,
    isLoading,
    error,

    // Actions
    speak,
    startRecording,
    stopRecording,
    stopSpeaking,
    isVoiceAvailable,
  };
}