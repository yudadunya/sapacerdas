import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateResponse } from '@/lib/ai-engine'

// Kirim pesan balik ke WA via Fonnte
async function sendWAMessage(token: string, target: string, message: string) {
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target,
      message,
      typing: true,      // animasi "typing..." sebelum balas
      delay: 2,          // delay 2 detik biar natural
    }),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Format webhook Fonnte:
    // { sender, message, device, name, ... }
    const { sender, message, device } = body

    if (!sender || !message || !device) {
      return NextResponse.json({ status: false, message: 'Invalid payload' }, { status: 400 })
    }

    // Abaikan pesan dari diri sendiri
    if (body.isGroup || body.isSelf) {
      return NextResponse.json({ status: true, message: 'Ignored' })
    }

    const supabase = createServiceClient()

    // Cari wa_integration berdasarkan nomor device
    const { data: integration } = await supabase
      .from('wa_integrations')
      .select('*, persona:personas(*)')
      .eq('device_number', device)
      .eq('is_active', true)
      .single()

    if (!integration || !integration.persona) {
      return NextResponse.json({ status: false, message: 'No integration found for this device' })
    }

    const persona = integration.persona

    // Ambil atau buat session untuk sender ini
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('visitor_id', sender)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!session) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          persona_id: persona.id,
          tenant_id: persona.tenant_id,
          visitor_id: sender,
          contact_phone: sender,
          contact_name: body.name || sender,
          channel: 'whatsapp',
        })
        .select()
        .single()
      session = newSession
    }

    // Ambil riwayat pesan (10 terakhir)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const messages = [
      ...(history || []).reverse(),
      { role: 'user' as const, content: message },
    ]

    // Generate AI response
    const result = await generateResponse(persona, messages, session.id)

    // Simpan pesan ke DB
    await supabase.from('messages').insert([
      { session_id: session.id, role: 'user', content: message, from_cache: false, tokens_used: 0 },
      { session_id: session.id, role: 'assistant', content: result.text, from_cache: result.fromCache || false, tokens_used: result.tokensUsed },
    ])

    // Update session
    await supabase.from('chat_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.id)

    // Kirim balas ke WA
    await sendWAMessage(integration.fonnte_token, sender, result.text)

    // Log usage
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
