// This Edge Function runs in Deno runtime, not Node.js
// TypeScript errors about Deno imports are expected in VS Code
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { homeTeam, awayTeam, gameDate, location, spread, overUnder } = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = (globalThis as any).Deno?.env?.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert NFL analyst. Analyze games based on team performance, injury reports, weather conditions, and other relevant factors. Provide detailed analysis with specific predictions.`
          },
          {
            role: 'user',
            content: `Analyze this NFL game:
              
Home Team: ${homeTeam}
Away Team: ${awayTeam}
Date: ${gameDate}
Location: ${location}
Current Spread: ${spread}
Over/Under: ${overUnder}

Please provide:
1. Detailed analysis of both teams' recent performance
2. Key factors that could influence the game
3. Your prediction for the winner and why
4. Confidence level (1-10)
5. Any concerns or risks with this pick

Format your response as a comprehensive analysis that would help sports bettors make informed decisions.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const analysis = openaiData.choices[0].message.content

    // Return the analysis
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        prediction: {
          homeTeam,
          awayTeam,
          gameDate,
          location,
          analysis,
          confidence: 8, // This could be extracted from the AI response
          createdAt: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Error in generate-prediction function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'An error occurred generating the prediction'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})