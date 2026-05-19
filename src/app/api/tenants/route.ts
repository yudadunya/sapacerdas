import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/tenants - list tenants for logged-in user
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role, tenant:tenants(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/tenants - create new tenant
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, slug, plan = 'starter' } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }

  const service = createServiceClient()

  // Check slug availability
  const { data: existing } = await service.from('tenants').select('id').eq('slug', slug).single()
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({ name, slug, plan })
    .select()
    .single()

  if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 500 })

  // Add user as owner
  await service.from('tenant_users').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
  })

  return NextResponse.json(tenant, { status: 201 })
}
