import { supabase } from './supabase';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface TTSOptions {
  voice_id?: string;
  model_id?: string;
  voice_settings?: VoiceSettings;
}

export interface STTOptions {
  model_id?: string;
  language?: string;
  timestamp_granularities?: string[];
  response_format?: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
  duration?: number;
}

class ElevenLabsService {
  private getSupabaseUrl(): string {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error('Supabase URL not configured');
    }
    return url;
  }

  /**
   * Fallback speech-to-text using Web Speech API
   */
  private async fallbackSpeechToText(options: STTOptions & { recordingDuration?: number } = {}): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      logger.info('Starting fallback speech-to-text', { language: options.language });
      
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        logger.error('Web Speech API not supported');
        reject(new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = options.language || 'en-US';
      recognition.maxAlternatives = 1;

      let timeoutId: NodeJS.Timeout;

      recognition.onstart = () => {
        logger.debug('Fallback speech recognition started');
        // Set timeout for recording duration
        if (options.recordingDuration) {
          timeoutId = setTimeout(() => {
          recognition.stop();
          }, options.recordingDuration);
        }
      };

      recognition.onresult = (event) => {
        clearTimeout(timeoutId);
        const transcript = event.results[0][0].transcript;
        logger.info('Fallback transcription completed', { 
          transcript: transcript.substring(0, 100),
          confidence: event.results[0][0].confidence 
        });
        
        resolve({
          text: transcript,
          language: options.language || 'en-US',
          duration: 0,
        });
      };

      recognition.onerror = (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        logger.error('Fallback speech recognition error', { error: event.error });
        
        let errorMessage = 'Speech recognition failed. Please try again.';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection.';
            break;
        }
        
        reject(new Error(errorMessage));
      };

      recognition.onend = () => {
        if (timeoutId) clearTimeout(timeoutId);
        logger.debug('Fallback speech recognition ended');
      };

      try {
        recognition.start();
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error('Failed to start speech recognition. Please try again.'));
      }
    });
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      return Sentry.startSpan(
        {
          op: "ai.tts",
          name: "ElevenLabs Text-to-Speech",
        },
        async (span) => {
          span.setAttribute("text_length", text.length);
          span.setAttribute("voice_id", options.voice_id || 'pNInz6obpgDQGcFmaJgB');
          
          logger.info('Starting text-to-speech', { textLength: text.length });
          
          span.setAttribute("service", "elevenlabs");
      const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text,
          voice_id: options.voice_id || 'pNInz6obpgDQGcFmaJgB',
          model_id: options.model_id || 'eleven_monolingual_v1',
          voice_settings: options.voice_settings || {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
            logger.error('TTS API request failed', { status: response.status });
            span.setAttribute("fallback_used", true);
        throw new Error(`TTS failed with status ${response.status}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
          logger.info('TTS completed successfully', { audioSize: audioArrayBuffer.byteLength });
      await this.playAudio(audioArrayBuffer);
        }
      );
    } catch (error) {
      logger.error('Text-to-speech error', { error: error instanceof Error ? error.message : 'Unknown error' });
      Sentry.captureException(error);
      // Try fallback
      // Fallback to Web Speech API
      await this.fallbackTextToSpeech(text);
    }
  }

  /**
   * Fallback text-to-speech using Web Speech API
   */
  private async fallbackTextToSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info('Using fallback text-to-speech', { textLength: text.length });
      
      if (!('speechSynthesis' in window)) {
        logger.error('Speech synthesis not supported');
        reject(new Error('Text-to-speech is not supported in this browser.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        logger.error('Speech synthesis error', { error: event.error });
        reject(new Error('Text-to-speech failed. Please try again.'));
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Convert speech to text using ElevenLabs or fallback
   */
  async speechToText(options: STTOptions & { recordingDuration?: number } = {}): Promise<TranscriptionResult> {
    try {
      return Sentry.startSpan(
        {
          op: "ai.stt",
          name: "Speech-to-Text Processing",
        },
        async (span) => {
          span.setAttribute("language", options.language || 'en');
          span.setAttribute("duration_ms", options.recordingDuration || 5000);
          
          logger.info('Starting speech-to-text', { 
            language: options.language,
            duration: options.recordingDuration 
          });
      
          span.setAttribute("service", "elevenlabs");
          
          // Try ElevenLabs first, fallback to Web Speech API if it fails
          try {
            // Try ElevenLabs via Edge Functions
            const audioData = await this.recordAudio(
              options.recordingDuration || 5000,
            );
            
            if (!audioData || audioData.byteLength === 0) {
              logger.error('No audio data recorded');
              throw new Error('No audio data recorded. Please check your microphone permissions and try again.');
            }
            
            span.setAttribute("audio_size", audioData.byteLength);
            // Convert audio data to base64 for the Edge Function
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
            
            logger.debug('Sending audio data to Edge Function');
            const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/elevenlabs-stt`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                audio: base64Audio,
                model_id: options.model_id || 'scribe_v1',
                language: options.language || 'en',
                timestamp_granularities: options.timestamp_granularities || ['segment'],
                response_format: options.response_format || 'json',
              }),
            });

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unknown error');
              logger.error('STT API request failed', { status: response.status });
              throw new Error(`ElevenLabs STT service unavailable: ${response.status}`);
            }

            const result = await response.json();
            logger.info('STT completed successfully', { 
              textLength: result.text?.length || 0,
              hasSegments: !!result.segments 
            });
            
            return {
              text: result.text || '',
              language: options.language || 'en',
              duration: result.duration || 0,
              segments: result.segments,
            };
          } catch (elevenlabsError) {
            logger.warn('ElevenLabs STT failed, trying Web Speech API fallback', { 
              error: elevenlabsError instanceof Error ? elevenlabsError.message : 'Unknown error' 
            });
            span.setAttribute("fallback_used", true);
            
            // Try Web Speech API fallback
            return await this.fallbackSpeechToText(options);
          }
        }
      );
    } catch (error) {
      logger.error('Speech-to-text error', { error: error instanceof Error ? error.message : 'Unknown error' });
      Sentry.captureException(error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('User denied') || error.message.includes('not-allowed')) {
          throw new Error('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('No audio data')) {
          throw new Error('No speech detected. Please speak clearly and try again.');
        } else if (error.message.includes('not supported')) {
          throw error;
        } else {
          throw new Error('Voice recording failed. Please try again.');
        }
      } else {
        throw new Error('Voice recording failed. Please try again.');
      }
    }
  }

  /**
   * Convert speech to text using FormData (for direct file upload)
   */
  async speechToTextFromFile(audioFile: File, options: STTOptions = {}): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('model_id', options.model_id || 'scribe_v1');
      formData.append('language', options.language || 'en');
      formData.append('timestamp_granularities', (options.timestamp_granularities || ['segment']).join(','));
      formData.append('response_format', options.response_format || 'json');

      const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/elevenlabs-stt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `STT failed with status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw error;
    }
  }

  /**
   * Play audio from ArrayBuffer
   */
  async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      // Create blob from audio data
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }

  /**
   * Record audio from microphone (web only)
   */
  async recordAudio(
    durationMs: number = 5000,
  ): Promise<ArrayBuffer> {
    return Sentry.startSpan(
      {
        op: "media.record",
        name: "Audio Recording",
      },
      async (span) => {
        span.setAttribute("duration_ms", durationMs);
        
        try {
      if (!('mediaDevices' in navigator)) {
            logger.error('MediaDevices not available');
        throw new Error('Voice recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }
      
          logger.debug('Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
          logger.info('Microphone access granted, starting recording');
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        stream.getTracks().forEach(track => track.stop());
            logger.error('MediaRecorder not supported');
        throw new Error('Audio recording is not supported in this browser.');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      const chunks: Blob[] = [];

      return new Promise((resolve, reject) => {
        let startTime = Date.now();
        let progressInterval: NodeJS.Timeout;
        let hasData = false;
        let recordingTimeout: NodeJS.Timeout;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            hasData = true;
              logger.debug(logger.fmt`Audio data chunk received: ${event.data.size} bytes`);
          }
        };

        mediaRecorder.onstop = async () => {
            logger.debug('Recording stopped');
          stream.getTracks().forEach(track => track.stop());
          if (progressInterval) clearInterval(progressInterval);
          if (recordingTimeout) clearTimeout(recordingTimeout);
          
          if (!hasData) {
            reject(new Error('No audio data was recorded. Please check your microphone permissions and speak clearly.'));
            return;
          }
          
          const audioBlob = new Blob(chunks, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
            logger.info('Audio blob created', { size: audioBlob.size });
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          // Validate that we have audio data
          if (arrayBuffer.byteLength === 0) {
            reject(new Error('No audio data recorded. Please speak clearly and try again.'));
            return;
          }
          
            logger.info('Audio recording complete', { size: arrayBuffer.byteLength });
            span.setAttribute("audio_size", arrayBuffer.byteLength);
          resolve(arrayBuffer);
        };

        mediaRecorder.onerror = (error) => {
            logger.error('MediaRecorder error', { error });
          stream.getTracks().forEach(track => track.stop());
          if (progressInterval) clearInterval(progressInterval);
          if (recordingTimeout) clearTimeout(recordingTimeout);
          
          logger.error('MediaRecorder error', { error });
          Sentry.captureException(error);
          reject(error);
        };

          logger.debug('Starting MediaRecorder');
        mediaRecorder.start();
        
        // Stop recording after specified duration
        recordingTimeout = setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
              logger.debug(logger.fmt`Stopping recording after ${durationMs}ms`);
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (error) {
        logger.error('Audio recording error', { error: error instanceof Error ? error.message : 'Unknown error' });
        Sentry.captureException(error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions in your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('Audio recording is not supported in this browser. Please use a modern browser.');
        } else {
          throw error;
        }
      } else {
        throw new Error('Failed to access microphone. Please try again.');
      }
    }
      }
    );
  }

  /**
   * Check if speech synthesis is available
   */
  isSpeechAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Check if speech recognition is available
   */
  isRecognitionAvailable(): boolean {
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  /**
   * Stop current speech
   */
  async stopSpeech(): Promise<void> {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      logger.debug('Speech synthesis cancelled');
    }
  }
}

export const elevenLabs = new ElevenLabsService();