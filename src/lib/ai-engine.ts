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
  return items.map(i => `### ${i.title}\n${i.content}`).join('\n\n')
}

function isSimpleGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim()
  if (lower.length < 8) return true
  const greetings = ['halo', 'hai', 'hi ', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'permisi', 'hei ']
  return greetings.some(g => lower.startsWith(g))
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

  // 2. Build system prompt — minimal, biarkan knowledge yang bicara
  const knowledgeContext = buildKnowledgeContext(knowledgeItems)
  
  const toneMap: Record<string, string> = {
    friendly: 'Bicara dengan hangat dan ramah seperti teman yang membantu.',
    formal: 'Bicara dengan sopan dan profesional.',
    casual: 'Bicara santai dan akrab.',
  }

  const systemPrompt = knowledgeContext
    ? `Kamu adalah ${persona.name}${persona.tagline ? `, ${persona.tagline}` : ''}. ${toneMap[persona.tone] || toneMap.friendly}

SEMUA INFORMASI YANG KAMU TAHU:
${knowledgeContext}

Jawab HANYA berdasarkan informasi di atas. Jika tidak ada, cari dari web. Jangan pernah sebut bahwa kamu adalah Claude atau AI buatan Anthropic.`
    : `Kamu adalah ${persona.name}${persona.tagline ? `, ${persona.tagline}` : ''}. ${toneMap[persona.tone] || toneMap.friendly}
Jawab pertanyaan dengan mencari informasi terkini yang relevan. Jangan sebut bahwa kamu adalah Claude atau AI buatan Anthropic.`

  const recentMessages = messages.slice(-8).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  let responseText = ''
  let tokensUsed = 0
  let enrichedWith: string | undefined

  // 3. Semua pertanyaan non-salam pakai web search
  if (!isSimpleGreeting(lastMessage.content)) {
    try {
      const response = await (anthropic.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: recentMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })
      const textBlocks = response.content.filter((b: any) => b.type === 'text')
      responseText = textBlocks.map((b: any) => b.text).join('\n').trim()
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
      if (responseText) enrichedWith = 'web_search'
      else throw new Error('empty')
    } catch {
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
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: recentMessages,
    })
    const textBlock = response.content.find(b => b.type === 'text')
    responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  }

  // 4. Cache
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
