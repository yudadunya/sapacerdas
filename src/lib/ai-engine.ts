/**
 * SapaCerdas AI Engine v3
 * Model: claude-sonnet-4-6
 * - Web search aktif otomatis (AI yang memutuskan kapan perlu search)
 * - Knowledge base dibaca sebagai konteks terstruktur
 * - System prompt minimal — persona saja, bukan instruksi panjang
 * - Tidak ada keyword trigger
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Persona {
  id: string
  name: string
  system_prompt: string
  welcome_message: string
  tone?: string
  topics_allowed?: string[]
}

interface KnowledgeItem {
  title: string
  content: string
  source_type: string
  source_url?: string
}

interface AIResponse {
  text: string
  tokensUsed: number
  usedWebSearch: boolean
}

// ─── Ambil knowledge base dari Supabase ──────────────────────────────────────

async function getKnowledge(personaId: string): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from('knowledge_items')
    .select('title, content, source_type, source_url')
    .eq('persona_id', personaId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return data
}

// ─── Format knowledge sebagai konteks terstruktur ────────────────────────────

function buildKnowledgeContext(items: KnowledgeItem[]): string {
  if (items.length === 0) return ''

  const sections = items.map((item, i) => {
    const sourceNote = item.source_url ? ` (sumber: ${item.source_url})` : ''
    return `[${i + 1}] ${item.title}${sourceNote}\n${item.content}`
  })

  return `\n\n---\nINFORMASI YANG KAMU KETAHUI:\n${sections.join('\n\n')}\n---`
}

// ─── Build system prompt yang benar-benar minimal ────────────────────────────

function buildSystemPrompt(persona: Persona, knowledgeContext: string): string {
  const baseName = persona.name || 'Asisten'

  // System prompt seminimal mungkin — cukup identitas + instruksi kunci
  const core = `Kamu adalah ${baseName}.

Cara menjawab:
- Bicara natural seperti orang nyata, bukan seperti chatbot atau CS
- Jawab langsung ke inti, tanpa basa-basi pembuka seperti "Tentu saja!" atau "Baik, saya akan..."
- Kalau ada informasi di knowledge base, gunakan itu sebagai referensi utama
- Kalau perlu info terkini yang tidak ada di knowledge base, cari sendiri lewat web search
- Jangan pernah menyebut bahwa kamu Claude, AI buatan Anthropic, atau AI apapun
- Jangan bilang "Berdasarkan knowledge base saya..." — langsung jawab saja${knowledgeContext}`

  return core
}

// ─── Fungsi utama: generate respons ──────────────────────────────────────────

export async function generateResponse(
  persona: Persona,
  messages: Message[],
  sessionId: string
): Promise<AIResponse> {
  // 0. Jika HANYA satu pesan dan isinya salam pendek — balas dengan welcome_message
  const greetings = ['hi', 'halo', 'hai', 'hello', 'hei', 'pagi', 'siang', 'sore', 'malam', 'permisi', 'assalamualaikum', 'waalaikumsalam']
  const msgLower = messages[messages.length - 1].content.toLowerCase().trim()
  const prevMessages = messages.slice(0, -1)
  const hasNoHistory = prevMessages.filter(m => m.role === 'assistant').length === 0
  const isExactGreeting = greetings.some(g => msgLower === g || msgLower === g + '!' || msgLower === g + ' wr wb')

  if (hasNoHistory && isExactGreeting) {
    const welcomeText = persona.welcome_message || `Halo! Saya ${persona.name}. Ada yang bisa saya bantu?`
    void supabase.from('usage_logs').insert({ tenant_id: persona.id, persona_id: persona.id, event_type: 'chat', tokens_used: 0 })
    return { text: welcomeText, tokensUsed: 0, usedWebSearch: false }
  }

  // 1. Ambil knowledge base
  const knowledgeItems = await getKnowledge(persona.id)
  const knowledgeContext = buildKnowledgeContext(knowledgeItems)

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(persona, knowledgeContext)

  // 3. Format messages untuk API
  const apiMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // 4. Panggil API dengan web_search tool aktif
  //    AI yang memutuskan sendiri kapan perlu search — tidak ada trigger manual
  let responseText = ''
  let tokensUsed = 0
  let usedWebSearch = false

  try {
    const response = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
    })

    // 5. Ambil teks dari response (bisa ada tool_use blocks juga)
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text
      }
      if (block.type === 'tool_use' && block.name === 'web_search') {
        usedWebSearch = true
      }
    }

    tokensUsed = response.usage?.output_tokens ?? 0

    // Handle multi-turn jika ada tool_use (web search memerlukan follow-up)
    if (response.stop_reason === 'tool_use') {
      const toolResults = response.content
        .filter((b: any) => b.type === 'tool_use')
        .map((b: any) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: b.input?.query
            ? `Mencari: ${b.input.query}`
            : 'Searching...',
        }))

      const followUp = await (anthropic.messages.create as any)({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...apiMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
      })

      responseText = ''
      for (const block of followUp.content) {
        if (block.type === 'text') {
          responseText += block.text
        }
      }

      tokensUsed += followUp.usage?.output_tokens ?? 0
    }
  } catch (err) {
    console.error('AI engine error:', err)
    responseText =
      'Maaf, ada gangguan sebentar. Coba tanyakan lagi ya.'
  }

  // 6. Log usage (fire and forget, jangan block response)
  void supabase
    .from('usage_logs')
    .insert({
      tenant_id: persona.id,
      persona_id: persona.id,
      event_type: usedWebSearch ? 'chat_with_search' : 'chat',
      tokens_used: tokensUsed,
    })

  return { text: responseText, tokensUsed, usedWebSearch }
}

// ─── Update knowledge dari URL (dipanggil dari /api/knowledge/enrich) ─────────

export async function enrichKnowledgeFromUrl(
  url: string,
  personaId: string,
  tenantId: string
): Promise<{ title: string; content: string }> {
  // Fetch konten URL
  let rawContent = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SapaCerdas/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    // Strip HTML tags secara sederhana
    rawContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000) // batasi agar tidak terlalu panjang
  } catch {
    throw new Error('Gagal mengambil konten dari URL tersebut')
  }

  // Minta AI merangkum
  const summary = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Rangkum konten dari URL ini menjadi knowledge base yang informatif dan terstruktur. Tulis dalam Bahasa Indonesia. Fokus pada fakta dan informasi penting. Maksimal 500 kata.\n\nURL: ${url}\n\nKonten:\n${rawContent}`,
      },
    ],
  })

  const summaryText =
    summary.content[0].type === 'text'
      ? summary.content[0].text
      : 'Tidak dapat merangkum konten.'

  // Buat judul dari domain
  const domain = new URL(url).hostname.replace('www.', '')
  const title = `Konten dari ${domain}`

  // Simpan ke knowledge_items
  await supabase.from('knowledge_items').upsert(
    {
      persona_id: personaId,
      tenant_id: tenantId,
      title,
      content: summaryText,
      source_type: 'url',
      source_url: url,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'persona_id,source_url' }
  )

  return { title, content: summaryText }
}

// ─── Update knowledge dari topik (web search → simpan ke DB) ─────────────────

export async function enrichKnowledgeFromTopic(
  topic: string,
  personaId: string,
  tenantId: string
): Promise<{ title: string; content: string }> {
  const response = await (anthropic.messages.create as any)({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Cari dan rangkum informasi terkini tentang: "${topic}". Tulis dalam Bahasa Indonesia, terstruktur, maksimal 500 kata. Fokus pada fakta terbaru.`,
      },
    ],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
    ],
  })

  let summaryText = ''

  // Handle multi-turn jika ada tool_use
  if (response.stop_reason === 'tool_use') {
    const toolResults = response.content
      .filter((b: any) => b.type === 'tool_use')
      .map((b: any) => ({
        type: 'tool_result' as const,
        tool_use_id: b.id,
        content: `Searching for: ${b.input?.query}`,
      }))

    const followUp = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Cari dan rangkum informasi terkini tentang: "${topic}". Tulis dalam Bahasa Indonesia, terstruktur, maksimal 500 kata.`,
        },
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    for (const block of followUp.content) {
      if (block.type === 'text') summaryText += block.text
    }
  } else {
    for (const block of response.content) {
      if (block.type === 'text') summaryText += block.text
    }
  }

  const title = `Info: ${topic}`

  // Simpan ke knowledge_items
  await supabase.from('knowledge_items').insert({
    persona_id: personaId,
    tenant_id: tenantId,
    title,
    content: summaryText,
    source_type: 'web_search',
    is_active: true,
    last_synced_at: new Date().toISOString(),
  })

  return { title, content: summaryText }
}

export type ChatMessage = Message

