import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

async function getUserFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return null
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    return user
  } catch { return null }
}

// GET /api/wa/integrations?personaId=xxx
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get('personaId')
  if (!personaId) return NextResponse.json({ error: 'personaId required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('wa_integrations')
    .select('*')
    .eq('persona_id', personaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/wa/integrations - add integration
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { personaId, tenantId, fonnteToken, deviceNumber, deviceName } = await req.json()
  if (!personaId || !fonnteToken || !deviceNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify Fonnte token by calling their device API
  try {
    const check = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
    })
    const checkData = await check.json()
    if (!checkData.status) {
      return NextResponse.json({ error: 'Token Fonnte tidak valid atau device belum terhubung' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Gagal verifikasi token Fonnte' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('wa_integrations')
    .insert({
      persona_id: personaId,
      tenant_id: tenantId,
      fonnte_token: fonnteToken,
      device_number: deviceNumber,
      device_name: deviceName || deviceNumber,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/wa/integrations?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.from('wa_integrations').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
