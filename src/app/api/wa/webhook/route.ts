import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateResponse } from '@/lib/ai-engine'

async function sendWAMessage(token: string, target: string, message: string) {
  const params = new URLSearchParams()
  params.append('target', target)
  params.append('message', message)
  params.append('typing', 'true')
  params.append('delay', '2')

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
    },
    body: params,
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('WA Webhook received:', JSON.stringify(body))

    const sender = body.sender || body.pengirim
    const message = body.message || body.pesan
    const device = body.device

    if (!sender || !message || !device) {
      console.log('Missing fields:', { sender, message, device })
      return NextResponse.json({ status: false, message: 'Invalid payload' }, { status: 400 })
    }

    // Abaikan grup
    if (body.isgroup || body.isGroup) {
      return NextResponse.json({ status: true, message: 'Ignored group' })
    }

    const supabase = createServiceClient()

    // Step 1: Cari integrasi berdasarkan device
    const { data: integration, error: intError } = await supabase
      .from('wa_integrations')
      .select('*')
      .eq('device_number', device)
      .eq('is_active', true)
      .maybeSingle()

    if (intError) {
      console.log('Integration query error:', intError.message)
      return NextResponse.json({ status: false, message: intError.message }, { status: 500 })
    }

    if (!integration) {
      console.log('No integration found for device:', device)
      return NextResponse.json({ status: false, message: 'No integration found' })
    }

    console.log('Integration found:', integration.id, 'persona_id:', integration.persona_id)

    // Step 2: Ambil persona secara terpisah
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', integration.persona_id)
      .eq('is_active', true)
      .maybeSingle()

    if (personaError || !persona) {
      console.log('Persona not found:', personaError?.message)
      return NextResponse.json({ status: false, message: 'Persona not found' })
    }

    console.log('Persona found:', persona.name)

    // Step 3: Ambil atau buat session
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('visitor_id', sender)
      .order('created_at', { ascending: false })
      .limit(1)

    let session = sessions?.[0] || null

    if (!session) {
      // WA sudah punya nama & nomor — langsung capture otomatis
      const contactName = body.pushname || body.name || sender
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          persona_id: persona.id,
          tenant_id: persona.tenant_id,
          visitor_id: sender,
          contact_phone: sender,
          contact_name: contactName,
          channel: 'whatsapp',
          captured_at: new Date().toISOString(), // auto capture karena WA sudah ada datanya
        })
        .select()
        .single()
      session = newSession
      console.log('New session created:', session?.id, 'contact:', contactName)

      // Log contact captured
      if (newSession) {
        await supabase.from('usage_logs').insert({
          tenant_id: persona.tenant_id,
          persona_id: persona.id,
          event_type: 'contact_captured',
          tokens_used: 0,
        })
      }
    }

    if (!session) {
      return NextResponse.json({ status: false, message: 'Session error' }, { status: 500 })
    }

    // Step 4: Ambil history pesan
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(10)

    const messages = [
      ...(history || []),
      { role: 'user' as const, content: message },
    ]

    console.log('Generating AI response for:', message)

    // Step 5: Generate AI response
    const result = await generateResponse(persona, messages, session.id)

    console.log('AI response generated:', result.text?.slice(0, 100))

    // Step 6: Simpan pesan
    await supabase.from('messages').insert([
      { session_id: session.id, role: 'user', content: message, from_cache: false, tokens_used: 0 },
      { session_id: session.id, role: 'assistant', content: result.text, from_cache: false, tokens_used: result.tokensUsed },
    ])

    // Step 7: Update session
    await supabase.from('chat_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.id)

    // Step 8: Kirim balas ke WA
    const sendResult = await sendWAMessage(integration.fonnte_token, sender, result.text)
    console.log('Fonnte send result:', JSON.stringify(sendResult))

    // Step 9: Log usage
    await supabase.from('usage_logs').insert({
      tenant_id: persona.tenant_id,
      persona_id: persona.id,
      event_type: 'whatsapp_message',
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({ status: true, message: 'OK' })
  } catch (error) {
    console.error('WA webhook error:', error)
    return NextResponse.json({ status: false, message: 'Internal error' }, { status: 500 })
  }
}
