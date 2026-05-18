import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { chat } from '@/lib/claude'
import { Message } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { tenantSlug, messages, sessionId, conversationId } = await req.json()

    if (!tenantSlug || !messages || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Ambil tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Buat atau ambil conversation
    let convId = conversationId
    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenant.id,
          session_id: sessionId,
        })
        .select('id')
        .single()
      convId = newConv?.id
    }

    // Simpan pesan user
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg.role === 'user' && convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        tenant_id: tenant.id,
        role: 'user',
        content: lastUserMsg.content
      })
    }

    // Panggil Claude
    const result = await chat({
      tenantId: tenant.id,
      systemPrompt: tenant.system_prompt,
      messages: messages as Message[],
      useCache: true
    })

    // Simpan response AI
    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        tenant_id: tenant.id,
        role: 'assistant',
        content: result.response,
        tokens_used: result.tokens,
        cached: result.cached
      })
    }

    return NextResponse.json({
      response: result.response,
      cached: result.cached,
      conversationId: convId
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
