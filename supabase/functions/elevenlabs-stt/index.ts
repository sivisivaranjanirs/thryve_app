import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface STTRequest {
  audio: string // base64 encoded audio
  model_id?: string
  language?: string
  timestamp_granularities?: string[]
  response_format?: string
}

// Maximum audio file size: 2MB
const MAX_AUDIO_SIZE = 2 * 1024 * 1024

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const contentType = req.headers.get('content-type')
    
    let audioData: ArrayBuffer
    let model_id = 'scribe_v1'
    let language = 'en'
    let timestamp_granularities = ['segment']
    let response_format = 'json'

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (direct audio file upload)
      const formData = await req.formData()
      const audioFile = formData.get('file') as File || formData.get('audio') as File
      const modelParam = formData.get('model_id') as string
      const langParam = formData.get('language') as string
      const timestampParam = formData.get('timestamp_granularities') as string
      const formatParam = formData.get('response_format') as string

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: 'Audio file is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check file size before processing
      if (audioFile.size > MAX_AUDIO_SIZE) {
        console.error('Audio file too large:', audioFile.size, 'bytes')
        return new Response(
          JSON.stringify({ 
            error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Processing FormData audio file:', audioFile.name, audioFile.size, audioFile.type)

      try {
        audioData = await audioFile.arrayBuffer()
      } catch (error) {
        console.error('Error reading audio file:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to read audio file' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (modelParam) model_id = modelParam
      if (langParam) language = langParam
      if (timestampParam) timestamp_granularities = timestampParam.split(',')
      if (formatParam) response_format = formatParam

    } else {
      // Handle JSON (base64 encoded audio)
      let requestBody: STTRequest
      
      try {
        requestBody = await req.json() as STTRequest
      } catch (error) {
        console.error('Invalid JSON in request body:', error)
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { audio, model_id: reqModelId, language: reqLang, timestamp_granularities: reqTimestamp, response_format: reqFormat } = requestBody

      if (!audio) {
        return new Response(
          JSON.stringify({ error: 'Audio data is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check base64 string size before decoding (rough estimate)
      const estimatedSize = (audio.length * 3) / 4
      if (estimatedSize > MAX_AUDIO_SIZE) {
        console.error('Base64 audio data too large:', estimatedSize, 'bytes (estimated)')
        return new Response(
          JSON.stringify({ 
            error: `Audio data too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Processing JSON audio data, length:', audio.length)
      
      // Decode base64 audio with proper error handling
      try {
        const binaryString = atob(audio)
        audioData = new ArrayBuffer(binaryString.length)
        
        // Validate actual decoded size
        if (audioData.byteLength > MAX_AUDIO_SIZE) {
          console.error('Decoded audio data too large:', audioData.byteLength, 'bytes')
          return new Response(
            JSON.stringify({ 
              error: `Audio data too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB` 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const uint8Array = new Uint8Array(audioData)
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i)
        }
      } catch (error) {
        console.error('Base64 decode error:', error)
        
        return new Response(
          JSON.stringify({ error: 'Invalid base64 audio data' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (reqModelId) model_id = reqModelId
      if (reqLang) language = reqLang
      if (reqTimestamp) timestamp_granularities = reqTimestamp
      if (reqFormat) response_format = reqFormat
    }

    // Final size validation
    if (audioData.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Audio data is empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (audioData.byteLength > MAX_AUDIO_SIZE) {
      console.error('Final audio data size check failed:', audioData.byteLength, 'bytes')
      return new Response(
        JSON.stringify({ 
          error: `Audio data too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not found in environment')
      
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FormData for ElevenLabs Scribe API
    console.log('Preparing FormData for ElevenLabs API, audio size:', audioData.byteLength, 'bytes')
    
    let formData: FormData
    try {
      formData = new FormData()
      const audioBlob = new Blob([audioData], { type: 'audio/webm' })
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model_id', model_id)
      formData.append('language', language)
      if (timestamp_granularities.length > 0) {
        timestamp_granularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity)
        })
      }
      formData.append('response_format', response_format)
    } catch (error) {
      console.error('Error preparing FormData:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to prepare audio data for processing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call ElevenLabs Scribe_v1 STT API with timeout
    console.log('Calling ElevenLabs STT API with model:', model_id, 'language:', language)
    
    let response: Response
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
    } catch (error) {
      console.error('Network error calling ElevenLabs API:', error)
      
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout - audio processing took too long' }),
          { 
            status: 408, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Network error connecting to speech service' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs STT API error:', response.status, response.statusText, errorText)
      
      // Handle specific error codes
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (response.status >= 500) {
        return new Response(
          JSON.stringify({ error: 'Speech service temporarily unavailable' }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe speech' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let transcriptionResult: any
    try {
      transcriptionResult = await response.json()
    } catch (error) {
      console.error('Error parsing ElevenLabs response:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid response from speech service' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('ElevenLabs STT result:', transcriptionResult)
    
    // Ensure we return the expected format with validation
    const result = {
      text: typeof transcriptionResult.text === 'string' ? transcriptionResult.text : '',
      segments: Array.isArray(transcriptionResult.segments) ? transcriptionResult.segments : [],
      language: typeof transcriptionResult.language === 'string' ? transcriptionResult.language : language,
      duration: typeof transcriptionResult.duration === 'number' ? transcriptionResult.duration : 0
    }
    
    console.log('Returning formatted result:', result)
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in STT function:', error)
    console.error('Error stack:', error.stack)
    
    // Return a generic error to avoid exposing internal details
    return new Response(
      JSON.stringify({ error: 'Internal server error occurred while processing audio' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})