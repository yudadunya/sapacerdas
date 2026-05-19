import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-secret') === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantSlug = searchParams.get('tenant')
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug!)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [leadsRes, convRes, msgRes, cacheRes] = await Promise.all([
    supabase.from('leads').select('id, created_at, topic, location').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('conversations').select('id, message_count, started_at').eq('tenant_id', tenant.id).order('started_at', { ascending: false }).limit(100),
    supabase.from('messages').select('id, cached, tokens_used').eq('tenant_id', tenant.id),
    supabase.from('response_cache').select('hit_count').eq('tenant_id', tenant.id)
  ])

  const totalMessages = msgRes.data?.length || 0
  const cachedMessages = msgRes.data?.filter(m => m.cached).length || 0
  const totalTokens = msgRes.data?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) || 0
  const cacheHits = cacheRes.data?.reduce((sum, c) => sum + (c.hit_count || 0), 0) || 0

  // Topic breakdown
  const topicMap: Record<string, number> = {}
  leadsRes.data?.forEach(l => {
    if (l.topic) topicMap[l.topic] = (topicMap[l.topic] || 0) + 1
  })

  return NextResponse.json({
    totalLeads: leadsRes.data?.length || 0,
    totalConversations: convRes.data?.length || 0,
    totalMessages,
    cachedMessages,
    cacheRatio: totalMessages > 0 ? Math.round((cachedMessages / totalMessages) * 100) : 0,
    totalTokens,
    estimatedCost: ((totalTokens / 1000) * 0.00025).toFixed(4),
    cacheHits,
    recentLeads: leadsRes.data?.slice(0, 10) || [],
    topicBreakdown: topicMap
  })
}
