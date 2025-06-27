# Thryve Health App

A comprehensive health tracking application built with Expo and React Native, featuring AI-powered chat assistance and voice interactions.

## Features

- **Health Metrics Tracking**: Track blood pressure, heart rate, blood glucose, temperature, and weight
- **AI Chat Assistant**: Get health advice and support through conversational AI
- **Voice Interactions**: Voice input for health metrics and text-to-speech for AI responses
- **Social Features**: Share health data with friends and family
- **Premium Subscriptions**: Unlock advanced features with premium plans

## Voice Features

This app integrates with ElevenLabs for both high-quality voice synthesis and speech recognition, all securely handled through Supabase Edge Functions.

### Voice Capabilities

- **Text-to-Speech**: AI responses can be spoken aloud using ElevenLabs TTS
- **Speech-to-Text**: Voice input for health metrics and chat messages using ElevenLabs Scribe
- **Premium Voice Features**: Enhanced voice quality and unlimited usage for premium users
- **Seamless Health Entry**: Speak your health metrics and they automatically populate the form

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   
   Copy `.env.example` to `.env` and configure your Supabase credentials:
   
   ```bash
   cp .env.example .env
   ```
   
   Required environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. **Supabase Edge Functions Setup**
   
   The voice features are handled securely through Supabase Edge Functions. You need to:
   
   a. **Deploy the Edge Functions**:
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Deploy the functions
   supabase functions deploy elevenlabs-tts
   supabase functions deploy elevenlabs-stt
   ```
   
   b. **Set Environment Secrets**:
   
   In your Supabase dashboard, go to Edge Functions → Settings and add these secrets:
   
   ```bash
   # ElevenLabs API Configuration
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ```

4. **API Keys Setup**
   
   To enable voice features, you only need:
   
   **ElevenLabs API Key**:
   - Sign up at [ElevenLabs](https://elevenlabs.io)
   - Get your API key from the dashboard
   
   **Note**: ElevenLabs handles both text-to-speech AND speech-to-text with their Scribe model, so you only need one API provider!

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Voice Integration Architecture

### Secure Server-Side Processing

All voice processing is handled securely through Supabase Edge Functions using only ElevenLabs:

- **Client → Edge Function → ElevenLabs → Client**
- API keys are never exposed to the client
- All requests are authenticated through Supabase Auth
- Rate limiting and usage monitoring can be implemented server-side

### Edge Functions

#### Text-to-Speech (`supabase/functions/elevenlabs-tts/`)
- Receives text from authenticated clients
- Calls ElevenLabs API with server-side API key
- Returns audio stream directly to client
- Supports voice customization and settings

#### Speech-to-Text (`supabase/functions/elevenlabs-stt/`)
- Receives audio data from authenticated clients
- Processes audio through ElevenLabs Scribe
- Returns transcribed text
- Supports multiple languages
- Automatically parses health metrics from speech

### Voice Service (`lib/elevenlabs.ts`)

Updated to use Supabase Edge Functions:
- **All Platforms**: Uses ElevenLabs through Edge Functions
- **Authentication**: All requests include Supabase auth tokens
- **Error Handling**: Graceful fallbacks and error reporting
- **Simplified Architecture**: Single provider for all voice features

### Voice Hook (`hooks/useVoice.ts`)

React hook for voice functionality:
- State management for recording/speaking
- Callback handling for voice events
- Error handling and loading states
- Integration with Edge Functions

### Voice Commands for Health Metrics

The app automatically parses voice input for health metrics and populates the form:

- **Blood Pressure**: "My blood pressure is 120 over 80"
- **Heart Rate**: "My heart rate is 72 beats per minute"
- **Weight**: "I weigh 150 pounds"
- **Blood Glucose**: "My blood sugar is 100"
- **Temperature**: "My temperature is 98.6 degrees"
- **Multiple Metrics**: "My blood pressure is 120 over 80 and heart rate is 72"

## Security Features

- **API Key Protection**: All API keys are stored server-side
- **Authentication Required**: All voice requests require valid Supabase auth
- **Rate Limiting**: Can be implemented in Edge Functions
- **Usage Monitoring**: Track API usage per user
- **Error Handling**: Secure error messages without exposing internals

## Platform Compatibility

- **Web**: Full integration with ElevenLabs through Edge Functions
- **iOS/Android**: Same ElevenLabs integration through Edge Functions
- **Development**: Works in Expo development environment

## Premium Features

Voice features are integrated with the premium subscription system:
- **Free Users**: Limited voice interactions per day
- **Premium Users**: Unlimited voice features with high-quality ElevenLabs voices

## Deployment

When deploying to production:

1. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy elevenlabs-tts --project-ref your-project-ref
   supabase functions deploy elevenlabs-stt --project-ref your-project-ref
   ```

2. **Set Production Secrets**:
   - Add your ElevenLabs API key to Supabase Edge Functions secrets

3. **Monitor Usage**:
   - Set up monitoring for Edge Function usage
   - Monitor API costs for ElevenLabs
   - Implement rate limiting if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test voice features on both web and mobile
5. Test Edge Functions locally with `supabase functions serve`
6. Submit a pull request

## License

This project is licensed under the MIT License.