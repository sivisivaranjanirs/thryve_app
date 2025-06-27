import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://238ed7e0b8c33a786e0a19b534bda162@o4508130833793024.ingest.us.sentry.io/4509481458204672",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  integrations: [
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration(),
    // Session replay for debugging
    Sentry.replayIntegration(),
    // User feedback integration
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      showName: false,
      showEmail: false,
    }),
  ],
  // Enable logs to be sent to Sentry
  _experiments: { enableLogs: true },
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  tracesSampleRate: 1.0,
  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: [
    /^\//, 
    /^https:\/\/.*\.supabase\.co\//, 
    /^https:\/\/api\.elevenlabs\.io\//
  ],
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment and release info
  environment: process.env.NODE_ENV || 'development',
  
  // Filter out common non-critical errors
  beforeSend(event, hint) {
    // Filter out network errors that are expected
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Don't send microphone permission errors as they're user-controlled
        if (error.message.includes('Microphone access denied') || 
            error.message.includes('User denied')) {
          return null;
        }
        
        // Don't send browser compatibility errors
        if (error.message.includes('not supported in this browser')) {
          return null;
        }
      }
    }
    
    return event;
  },
});