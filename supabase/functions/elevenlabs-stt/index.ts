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

      audioData = await audioFile.arrayBuffer()
      if (modelParam) model_id = modelParam
      if (langParam) language = langParam
      if (timestampParam) timestamp_granularities = timestampParam.split(',')
      if (formatParam) response_format = formatParam

    } else {
      // Handle JSON (base64 encoded audio)
      const { audio, model_id: reqModelId, language: reqLang, timestamp_granularities: reqTimestamp, response_format: reqFormat } = await req.json() as STTRequest

      if (!audio) {
        return new Response(
          JSON.stringify({ error: 'Audio data is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Decode base64 audio
      try {
        const binaryString = atob(audio)
        audioData = new ArrayBuffer(binaryString.length)
        const uint8Array = new Uint8Array(audioData)
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i)
        }
      } catch (error) {
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

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FormData for ElevenLabs Scribe API
    const formData = new FormData()
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

    // Call ElevenLabs Scribe_v1 STT API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs STT API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe speech' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const transcriptionResult = await response.json()
    
    // Ensure we return the expected format
    const result = {
      text: transcriptionResult.text || '',
      segments: transcriptionResult.segments || [],
      language: transcriptionResult.language || language,
      duration: transcriptionResult.duration || 0
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in STT function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})