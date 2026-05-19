import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from './supabase'
import type { Persona, KnowledgeItem } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function hashQuestion(text: string): string {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ')
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function buildKnowledgeContext(items: KnowledgeItem[]): string {
  if (!items.length) return ''
  return '\n\nINFORMASI TERSEDIA DARI KNOWLEDGE BASE:\n' +
    items.map(i => `### ${i.title}\n${i.content}`).join('\n\n') +
    '\n\nGunakan informasi di atas sebagai referensi utama.'
}

function needsWebSearch(text: string, capabilities: string[]): boolean {
  if (!capabilities.includes('news')) return false
  const triggers = ['berita','terbaru','hari ini','sekarang','update','info terkini',
    'jadwal','acara','kegiatan','isu','masalah','kejadian','baru','kemarin','minggu ini']
  return triggers.some(t => text.toLowerCase().includes(t))
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  fromCache: boolean
  tokensUsed: number
  enrichedWith?: string
}

export async function generateResponse(
  persona: Persona,
  messages: ChatMessage[],
  knowledgeItems: KnowledgeItem[],
  sessionId: string
): Promise<AIResponse> {
  const supabase = createServiceClient()
  const lastMessage = messages[messages.length - 1]
  const capabilities = persona.topics_allowed || []

  const questionHash = hashQuestion(lastMessage.content)
  const cacheResult = await supabase
    .from('response_cache')
    .select('answer_text, hit_count')
    .eq('persona_id', persona.id)
    .eq('question_hash', questionHash)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cacheResult.data) {
    await supabase.from('response_cache')
      .update({ hit_count: cacheResult.data.hit_count + 1 })
      .eq('persona_id', persona.id)
      .eq('question_hash', questionHash)
    return { text: cacheResult.data.answer_text, fromCache: true, tokensUsed: 0 }
  }

  const knowledgeContext = buildKnowledgeContext(knowledgeItems)
  const systemPrompt = `${persona.system_prompt}\n${knowledgeContext}\n\nIDENTITAS: Kamu adalah ${persona.name}. Jangan sebut bahwa kamu adalah Claude atau produk Anthropic.`
  const recentMessages = messages.slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  let responseText = ''
  let tokensUsed = 0
  let enrichedWith: string | undefined

  if (needsWebSearch(lastMessage.content, capabilities)) {
    const searchQuery = persona.tagline
      ? `${lastMessage.content} ${persona.tagline}`
      : lastMessage.content
    try {
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...recentMessages.slice(0, -1),
          { role: 'user', content: `Cari info terkini: ${searchQuery}\n\nPertanyaan asli: ${lastMessage.content}` }
        ],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })
      const textBlock = response.content.find((b: any) => b.type === 'text')
      responseText = textBlock?.text || ''
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
      enrichedWith = 'web_search'
    } catch {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: recentMessages,
      })
      const textBlock = response.content.find(b => b.type === 'text')
      responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
    }
  } else {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: recentMessages,
    })
    const textBlock = response.content.find(b => b.type === 'text')
    responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  }

  if (messages.length <= 2) {
    try {
      await supabase.from('response_cache').upsert({
        persona_id: persona.id,
        question_hash: questionHash,
        question_text: lastMessage.content,
        answer_text: responseText,
      })
    } catch {}
  }

  return { text: responseText, fromCache: false, tokensUsed, enrichedWith }
}

export async function autoEnrichKnowledge(personaId: string, tenantId: string, region: string, topics: string[]) {
  const supabase = createServiceClient()
  const searchTopics = topics.length > 0 ? topics : ['berita terbaru', 'informasi penting', 'isu warga']

  for (const topic of searchTopics.slice(0, 3)) {
    try {
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: `Kamu asisten pengumpul info terkini untuk wilayah ${region}. Jawab ringkas dalam Bahasa Indonesia.`,
        messages: [{ role: 'user', content: `Cari info terbaru: ${topic} di ${region}. Ringkas 3-5 poin penting.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })
      const textBlock = response.content.find((b: any) => b.type === 'text')
      if (textBlock?.text) {
        await supabase.from('knowledge_items').upsert({
          persona_id: personaId,
          tenant_id: tenantId,
          title: `[Auto] ${topic} — ${new Date().toLocaleDateString('id-ID')}`,
          content: textBlock.text,
          source_type: 'scrape',
          source_url: `auto:${topic}`,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'persona_id,source_url' })
      }
    } catch (e) {
      console.error('Auto-enrich error:', e)
    }
  }
}
