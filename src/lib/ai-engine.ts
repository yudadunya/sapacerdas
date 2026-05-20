/**
 * SapaCerdas AI Engine v4.1
 * - Greeting → welcome_message (0 token)
 * - Semua pertanyaan → Haiku (murah, ~10x lebih murah dari Sonnet)
 * - Web search hanya kalau ada kata trigger terkini/berita/jadwal
 * - Sonnet dihapus — Haiku sudah cukup untuk kebanyakan use case
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
}

interface KnowledgeItem {
  title: string
  content: string
  source_type: string
  source_url?: string
}

export interface AIResponse {
  text: string
  tokensUsed: number
  usedWebSearch: boolean
}

async function getKnowledge(personaId: string): Promise<KnowledgeItem[]> {
  const { data } = await supabase
    .from('knowledge_items')
    .select('title, content, source_type, source_url')
    .eq('persona_id', personaId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

function buildKnowledgeContext(items: KnowledgeItem[]): string {
  if (!items.length) return ''
  return '\n\n---\nINFORMASI YANG KAMU KETAHUI:\n' +
    items.map((item, i) => `[${i + 1}] ${item.title}\n${item.content}`).join('\n\n') +
    '\n---'
}

function buildSystemPrompt(persona: Persona, knowledgeContext: string): string {
  return `Kamu adalah ${persona.name}.

Cara menjawab:
- Bicara natural, bukan seperti chatbot atau CS
- Jawab langsung ke inti pertanyaan
- Gunakan informasi dari knowledge base sebagai referensi utama
- Jika tidak ada di knowledge base, jawab berdasarkan pengetahuan umum
- Jangan sebut bahwa kamu Claude, AI Anthropic, atau AI apapun${knowledgeContext}`
}

function needsWebSearch(question: string): boolean {
  const triggers = [
    'terbaru', 'hari ini', 'sekarang', 'kemarin', 'minggu ini', 'bulan ini',
    'update', 'berita', 'jadwal terbaru', 'agenda hari', 'acara hari',
    'harga sekarang', 'stok', 'buka sekarang', 'kabar terbaru'
  ]
  const q = question.toLowerCase()
  return triggers.some(t => q.includes(t))
}

export async function generateResponse(
  persona: Persona,
  messages: Message[],
  sessionId: string
): Promise<AIResponse> {
  const lastMsg = messages[messages.length - 1]
  const question = lastMsg.content
  const qLower = question.toLowerCase().trim()

  // TIER 0: Greeting tanpa history → welcome_message (gratis)
  const greetings = ['hi', 'halo', 'hai', 'hello', 'hei', 'pagi', 'siang', 'sore', 'malam', 'permisi', 'assalamualaikum', 'waalaikumsalam']
  const hasNoAssistantHistory = messages.filter(m => m.role === 'assistant').length === 0
  const isExactGreeting = greetings.some(g =>
    qLower === g || qLower === g + '!' || qLower === g + ' wr wb' || qLower === g + ' warahmatullahi wabarakatuh'
  )

  if (hasNoAssistantHistory && isExactGreeting) {
    // Biarkan AI menyambut secara natural berdasarkan system prompt
    // Jangan pakai welcome_message yang kaku
    try {
      const knowledgeItems = await getKnowledge(persona.id)
      const knowledgeContext = buildKnowledgeContext(knowledgeItems)
      const systemPrompt = buildSystemPrompt(persona, knowledgeContext)
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt + '\n\nSeseorang baru saja menyapa kamu. Sambut dengan hangat, perkenalkan diri secara natural dan singkat, lalu tanya ada yang bisa dibantu. Maksimal 2-3 kalimat.',
        messages: [{ role: 'user', content: question }],
      })
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock && 'text' in textBlock ? textBlock.text : persona.welcome_message
      return { text, tokensUsed: response.usage.input_tokens + response.usage.output_tokens, usedWebSearch: false }
    } catch {
      return {
        text: persona.welcome_message || `Halo! Saya ${persona.name}. Ada yang bisa saya bantu?`,
        tokensUsed: 0,
        usedWebSearch: false,
      }
    }
  }

  // Ambil knowledge base
  const knowledgeItems = await getKnowledge(persona.id)
  const knowledgeContext = buildKnowledgeContext(knowledgeItems)
  const systemPrompt = buildSystemPrompt(persona, knowledgeContext)
  const apiMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  let responseText = ''
  let tokensUsed = 0
  let usedWebSearch = false

  const useWebSearch = needsWebSearch(question)

  try {
    if (useWebSearch) {
      // Haiku + web search untuk info terkini
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: apiMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })

      for (const block of response.content) {
        if (block.type === 'text') responseText += block.text
        if (block.type === 'tool_use') usedWebSearch = true
      }
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens

      // Handle multi-turn
      if (response.stop_reason === 'tool_use') {
        const toolResults = response.content
          .filter((b: any) => b.type === 'tool_use')
          .map((b: any) => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: `Searching: ${b.input?.query || ''}`,
          }))

        const followUp = await (anthropic.messages.create as any)({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            ...apiMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        })

        responseText = ''
        for (const block of followUp.content) {
          if (block.type === 'text') responseText += block.text
        }
        tokensUsed += followUp.usage.input_tokens + followUp.usage.output_tokens
      }
    } else {
      // Haiku saja — untuk semua pertanyaan biasa
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: apiMessages,
      })
      const textBlock = response.content.find(b => b.type === 'text')
      responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
    }
  } catch (err) {
    console.error('AI engine error:', err)
    responseText = 'Maaf, ada gangguan sebentar. Coba tanyakan lagi ya.'
  }

  if (!responseText) {
    responseText = 'Maaf, ada gangguan sebentar. Coba tanyakan lagi ya.'
  }

  void supabase.from('usage_logs').insert({
    tenant_id: persona.id,
    persona_id: persona.id,
    event_type: usedWebSearch ? 'chat_with_search' : 'chat',
    tokens_used: tokensUsed,
  })

  return { text: responseText, tokensUsed, usedWebSearch }
}

export type ChatMessage = Message
