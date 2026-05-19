import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ChatPortal from '@/components/ChatPortal'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, owner_name, owner_title')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!tenant) return { title: 'Not Found' }

  return {
    title: `${tenant.name} — Asisten Digital ${tenant.owner_name}`,
    description: `Chat langsung dengan asisten AI ${tenant.owner_name}${tenant.owner_title ? `, ${tenant.owner_title}` : ''}`,
  }
}

export default async function PortalPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!tenant) notFound()

  return <ChatPortal tenant={tenant} />
}
