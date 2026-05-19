import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateResponse } from '@/lib/ai-engine'
import type { ChatMessage } from '@/lib/ai-engine'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, personaId, messages } = await req.json()

    if (!sessionId || !personaId || !messages?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Load persona
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .eq('is_active', true)
      .single()

    if (personaError || !persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Generate response — knowledge diambil otomatis di dalam engine
    const result = await generateResponse(
      persona,
      messages as ChatMessage[],
      sessionId
    )

    // Save messages to DB
    const lastUserMsg = messages[messages.length - 1]
    await supabase.from('messages').insert([
      {
        session_id: sessionId,
        role: 'user',
        content: lastUserMsg.content,
        from_cache: false,
        tokens_used: 0,
      },
      {
        session_id: sessionId,
        role: 'assistant',
        content: result.text,
        from_cache: false,
        tokens_used: result.tokensUsed,
      },
    ])

    // Update session
    await supabase
      .from('chat_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId)

    // Log usage
    await supabase.from('usage_logs').insert({
      tenant_id: persona.tenant_id,
      persona_id: personaId,
      event_type: result.usedWebSearch ? 'chat_with_search' : 'chat',
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      text: result.text,
      usedWebSearch: result.usedWebSearch,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
