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
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('role, tenant:tenants(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, slug } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug required' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug harus huruf kecil, angka, dan tanda hubung' }, { status: 400 })
  }

  const service = createServiceClient()

  // Cek slug duplikat
  const { data: existing } = await service
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Slug sudah dipakai' }, { status: 409 })
  }

  // Insert hanya kolom yang ada di tabel
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({ name, slug })
    .select()
    .single()

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 })
  }

  // Tambah user sebagai owner
  const { error: tuError } = await service.from('tenant_users').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
  })

  if (tuError) {
    console.error('tenant_users insert error:', tuError.message)
  }

  return NextResponse.json(tenant, { status: 201 })
}
