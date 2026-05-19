import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { personaId, tenantId, query, sourceUrl } = await req.json()

    if (!personaId || !tenantId || !query) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use web search to find and summarize content
    const response = await (anthropic.messages.create as any)({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: `Kamu adalah asisten yang bertugas mengumpulkan dan merangkum informasi dari internet. 
Tugasmu: cari informasi terkini tentang topik yang diminta, lalu rangkum menjadi dokumen yang informatif dan terstruktur dalam Bahasa Indonesia.
Format output:
- Gunakan poin-poin yang jelas
- Sertakan data/angka jika ada
- Tulis tanggal informasi jika diketahui
- Maksimal 500 kata`,
      messages: [
        {
          role: 'user',
          content: sourceUrl
            ? `Ambil dan rangkum informasi dari URL ini: ${sourceUrl}\n\nTopik fokus: ${query}`
            : `Cari dan rangkum informasi terkini tentang: ${query}`
        }
      ],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    const textBlock = response.content.find((b: any) => b.type === 'text')
    if (!textBlock?.text) {
      return NextResponse.json({ error: 'Tidak ada konten yang ditemukan' }, { status: 404 })
    }

    const supabase = createServiceClient()

    // Save to knowledge base
    const title = sourceUrl
      ? `[Web] ${query} — ${new Date().toLocaleDateString('id-ID')}`
      : `[Auto] ${query} — ${new Date().toLocaleDateString('id-ID')}`

    const { data, error } = await supabase.from('knowledge_items').insert({
      persona_id: personaId,
      tenant_id: tenantId,
      title,
      content: textBlock.text,
      source_type: 'scrape',
      source_url: sourceUrl || `search:${query}`,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error('Knowledge enrich error:', error)
    return NextResponse.json({ error: 'Gagal mengambil konten dari web' }, { status: 500 })
  }
}
