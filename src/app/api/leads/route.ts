import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { tenantSlug, conversationId, name, phone, location, topic } = await req.json()

    if (!tenantSlug || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Cek duplikat nomor untuk tenant ini
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, duplicate: true })
    }

    const { data: lead } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenant.id,
        conversation_id: conversationId || null,
        name,
        phone,
        location: location || null,
        topic: topic || null,
        source: 'portal'
      })
      .select()
      .single()

    // Update conversation dengan lead_id
    if (conversationId && lead) {
      await supabase
        .from('conversations')
        .update({ lead_id: lead.id })
        .eq('id', conversationId)
    }

    return NextResponse.json({ success: true, leadId: lead?.id })
  } catch (error) {
    console.error('Lead capture error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantSlug = searchParams.get('tenant')
    const adminSecret = req.headers.get('x-admin-secret')

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug!)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ leads })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
