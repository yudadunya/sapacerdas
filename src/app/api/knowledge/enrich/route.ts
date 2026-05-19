import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SapaCerdasBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    // Strip HTML tags, get plain text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000) // limit to 8k chars
    return text
  } catch (e) {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { personaId, tenantId, query, sourceUrl } = await req.json()

    if (!personaId || !tenantId || (!query && !sourceUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let prompt = ''
    let title = ''

    if (sourceUrl) {
      // Fetch URL content directly
      const rawContent = await fetchUrlContent(sourceUrl)

      if (rawContent) {
        prompt = `Berikut adalah konten dari URL ${sourceUrl}:\n\n${rawContent}\n\nRingkas informasi penting dari konten ini dalam Bahasa Indonesia. Fokus pada fakta, data, jadwal, atau informasi yang berguna. Format dengan poin-poin yang jelas. Maksimal 600 kata.`
        title = `[Web] ${query || sourceUrl} — ${new Date().toLocaleDateString('id-ID')}`
      } else {
        // Fallback: search by URL domain/topic
        prompt = `Cari informasi terkini dari website ${sourceUrl} tentang: ${query || 'informasi umum'}. Rangkum dalam Bahasa Indonesia dengan poin-poin yang jelas.`
        title = `[Search] ${query || sourceUrl} — ${new Date().toLocaleDateString('id-ID')}`
      }
    } else {
      // Pure web search
      prompt = `Cari dan rangkum informasi terkini tentang: ${query}. Sertakan fakta, angka, dan tanggal jika ada. Jawab dalam Bahasa Indonesia dengan format poin-poin yang jelas. Maksimal 600 kata.`
      title = `[Auto] ${query} — ${new Date().toLocaleDateString('id-ID')}`
    }

    // Call AI with web search for query-based, or direct summarization for URL content
    const useWebSearch = !sourceUrl || !(await fetchUrlContent(sourceUrl))

    let responseText = ''

    if (useWebSearch && !sourceUrl) {
      // Use web search tool
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'Kamu adalah asisten yang bertugas mengumpulkan dan merangkum informasi dari internet untuk knowledge base AI. Jawab dalam Bahasa Indonesia.',
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })
      const textBlock = response.content.find((b: any) => b.type === 'text')
      responseText = textBlock?.text || ''
    } else {
      // Summarize fetched content directly
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'Kamu adalah asisten yang merangkum konten web untuk knowledge base AI. Jawab dalam Bahasa Indonesia.',
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find(b => b.type === 'text')
      responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
    }

    if (!responseText) {
      return NextResponse.json({ error: 'Tidak ada konten yang ditemukan' }, { status: 404 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase.from('knowledge_items').insert({
      persona_id: personaId,
      tenant_id: tenantId,
      title,
      content: responseText,
      source_type: 'scrape',
      source_url: sourceUrl || `search:${query}`,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, item: data })

  } catch (error) {
    console.error('Knowledge enrich error:', error)
    return NextResponse.json({ error: 'Gagal mengambil konten dari web' }, { status: 500 })
  }
}
