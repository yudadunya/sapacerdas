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
  return '\n\n=== KNOWLEDGE BASE (gunakan sebagai referensi utama) ===\n' +
    items.map(i => `[${i.title}]\n${i.content}`).join('\n\n---\n') +
    '\n=== END KNOWLEDGE BASE ==='
}

// Semua pertanyaan pakai web search — tidak perlu trigger kata tertentu
// Kecuali pertanyaan sangat pendek atau salam
function shouldSearchWeb(text: string): boolean {
  const greetings = ['halo', 'hai', 'hi', 'selamat', 'permisi', 'hei', 'pagi', 'siang', 'sore', 'malam']
  const lower = text.toLowerCase().trim()
  if (lower.length < 10) return false
  if (greetings.some(g => lower === g || lower.startsWith(g + ' '))) return false
  return true
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

  // 1. Check cache
  const questionHash = hashQuestion(lastMessage.content)
  try {
    const { data: cached } = await supabase
      .from('response_cache')
      .select('answer_text, hit_count')
      .eq('persona_id', persona.id)
      .eq('question_hash', questionHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      await supabase.from('response_cache')
        .update({ hit_count: cached.hit_count + 1 })
        .eq('persona_id', persona.id)
        .eq('question_hash', questionHash)
      return { text: cached.answer_text, fromCache: true, tokensUsed: 0 }
    }
  } catch {}

  // 2. Build system prompt with knowledge base
  const knowledgeContext = buildKnowledgeContext(knowledgeItems)
  const systemPrompt = `${persona.system_prompt}
${knowledgeContext}

CARA MENJAWAB:
- Selalu gunakan informasi dari knowledge base di atas jika relevan
- Untuk informasi terkini (berita, jadwal, harga, kebijakan), gunakan web search
- Jawab seperti orang yang benar-benar paham konteks lokal dan situasi terkini
- Jangan jawab "saya tidak tahu" jika bisa dicari — cari dulu
- Akhiri setiap jawaban dengan 1 info tambahan yang relevan atau pertanyaan lanjutan yang membuka diskusi
- Kamu adalah ${persona.name}, bukan Claude atau AI Anthropic`

  const recentMessages = messages.slice(-8).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))

  let responseText = ''
  let tokensUsed = 0
  let enrichedWith: string | undefined

  // 3. Use web search for most questions
  if (shouldSearchWeb(lastMessage.content)) {
    try {
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: recentMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })

      // Extract text from response (may have tool_use blocks too)
      const textBlocks = response.content.filter((b: any) => b.type === 'text')
      responseText = textBlocks.map((b: any) => b.text).join('\n').trim()
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
      enrichedWith = 'web_search'

      // If web search returned empty text, fallback
      if (!responseText) {
        throw new Error('Empty response from web search')
      }
    } catch {
      // Fallback: answer without web search
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: recentMessages,
      })
      const textBlock = response.content.find(b => b.type === 'text')
      responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
    }
  } else {
    // Simple greeting/short message — no web search needed
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: recentMessages,
    })
    const textBlock = response.content.find(b => b.type === 'text')
    responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  }

  // 4. Cache simple questions
  if (messages.length <= 2 && responseText) {
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
