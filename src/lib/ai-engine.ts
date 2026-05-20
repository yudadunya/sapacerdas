/**
 * SapaCerdas AI Engine v4
 * - Greeting → welcome_message langsung (0 token)
 * - Knowledge base ada → Haiku tanpa web search (murah)
 * - Knowledge base tidak cukup → Haiku + web search
 * - Pertanyaan kompleks → Sonnet (jarang)
 * Estimasi hemat 70-80% dibanding v3
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

interface AIResponse {
  text: string
  tokensUsed: number
  usedWebSearch: boolean
}

// ─── Ambil knowledge base ─────────────────────────────────────────────────────

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

// ─── Cek apakah knowledge base relevan dengan pertanyaan ─────────────────────

function isKnowledgeRelevant(question: string, items: KnowledgeItem[]): boolean {
  if (items.length === 0) return false
  const q = question.toLowerCase()
  return items.some(item => {
    const text = (item.title + ' ' + item.content).toLowerCase()
    const words = q.split(/\s+/).filter(w => w.length > 3)
    const matches = words.filter(w => text.includes(w))
    return matches.length >= Math.min(2, words.length)
  })
}

// ─── Deteksi apakah butuh info terkini dari web ───────────────────────────────

function needsWebSearch(question: string): boolean {
  const triggers = [
    'terbaru', 'hari ini', 'sekarang', 'kemarin', 'minggu ini', 'bulan ini',
    'update', 'info terkini', 'berita', 'jadwal', 'agenda', 'acara',
    'harga sekarang', 'stok', 'tersedia', 'buka', 'tutup',
    'isu', 'kejadian', 'peristiwa', 'kabar'
  ]
  const q = question.toLowerCase()
  return triggers.some(t => q.includes(t))
}

// ─── Deteksi pertanyaan kompleks yang butuh Sonnet ───────────────────────────

function isComplexQuestion(question: string): boolean {
  const triggers = [
    'analisis', 'bandingkan', 'jelaskan secara detail', 'apa perbedaan antara',
    'bagaimana cara', 'strategi', 'rekomendasi', 'pendapat', 'opini'
  ]
  const q = question.toLowerCase()
  return q.length > 100 || triggers.some(t => q.includes(t))
}

// ─── Build knowledge context ──────────────────────────────────────────────────

function buildKnowledgeContext(items: KnowledgeItem[]): string {
  if (!items.length) return ''
  return '\n\n---\nINFORMASI YANG KAMU KETAHUI:\n' +
    items.map((item, i) => `[${i + 1}] ${item.title}\n${item.content}`).join('\n\n') +
    '\n---'
}

// ─── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(persona: Persona, knowledgeContext: string): string {
  return `Kamu adalah ${persona.name}.

Cara menjawab:
- Bicara natural seperti orang nyata, bukan seperti chatbot
- Jawab langsung ke inti tanpa basa-basi
- Gunakan informasi dari knowledge base sebagai referensi utama
- Jangan sebut bahwa kamu Claude, AI Anthropic, atau AI apapun${knowledgeContext}`
}

// ─── Fungsi utama ─────────────────────────────────────────────────────────────

export async function generateResponse(
  persona: Persona,
  messages: Message[],
  sessionId: string
): Promise<AIResponse> {
  const lastMsg = messages[messages.length - 1]
  const question = lastMsg.content

  // TIER 0: Greeting tanpa history → welcome_message (0 token, gratis)
  const greetings = ['hi', 'halo', 'hai', 'hello', 'hei', 'pagi', 'siang', 'sore', 'malam', 'permisi', 'assalamualaikum', 'waalaikumsalam']
  const qLower = question.toLowerCase().trim()
  const hasNoAssistantHistory = messages.filter(m => m.role === 'assistant').length === 0
  const isExactGreeting = greetings.some(g => qLower === g || qLower === g + '!' || qLower === g + ' wr wb')

  if (hasNoAssistantHistory && isExactGreeting) {
    const welcomeText = persona.welcome_message || `Halo! Saya ${persona.name}. Ada yang bisa saya bantu?`
    return { text: welcomeText, tokensUsed: 0, usedWebSearch: false }
  }

  // Ambil knowledge base
  const knowledgeItems = await getKnowledge(persona.id)
  const knowledgeContext = buildKnowledgeContext(knowledgeItems)
  const systemPrompt = buildSystemPrompt(persona, knowledgeContext)
  const apiMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  let responseText = ''
  let tokensUsed = 0
  let usedWebSearch = false

  // TIER 1: Knowledge base relevan + tidak butuh info terkini → Haiku saja (paling murah)
  const knowledgeRelevant = isKnowledgeRelevant(question, knowledgeItems)
  const needsWeb = needsWebSearch(question)
  const isComplex = isComplexQuestion(question)

  if (knowledgeRelevant && !needsWeb) {
    // Haiku tanpa web search
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: apiMessages,
      })
      const textBlock = response.content.find(b => b.type === 'text')
      responseText = textBlock && 'text' in textBlock ? textBlock.text : ''
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens
    } catch (err) {
      console.error('Haiku error:', err)
    }
  }

  // TIER 2: Butuh info terkini atau knowledge tidak relevan → Haiku + web search
  else if (!isComplex) {
    try {
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

      // Handle multi-turn web search
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
    } catch (err) {
      console.error('Haiku+search error:', err)
    }
  }

  // TIER 3: Pertanyaan kompleks → Sonnet + web search (jarang)
  else {
    try {
      const response = await (anthropic.messages.create as any)({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        messages: apiMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      })

      for (const block of response.content) {
        if (block.type === 'text') responseText += block.text
        if (block.type === 'tool_use') usedWebSearch = true
      }
      tokensUsed = response.usage.input_tokens + response.usage.output_tokens

      if (response.stop_reason === 'tool_use') {
        const toolResults = response.content
          .filter((b: any) => b.type === 'tool_use')
          .map((b: any) => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: `Searching: ${b.input?.query || ''}`,
          }))

        const followUp = await (anthropic.messages.create as any)({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
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
    } catch (err) {
      console.error('Sonnet error:', err)
    }
  }

  // Fallback kalau semua gagal
  if (!responseText) {
    responseText = 'Maaf, ada gangguan sebentar. Coba tanyakan lagi ya.'
  }

  // Log usage
  void supabase.from('usage_logs').insert({
    tenant_id: persona.id,
    persona_id: persona.id,
    event_type: usedWebSearch ? 'chat_with_search' : 'chat',
    tokens_used: tokensUsed,
  })

  return { text: responseText, tokensUsed, usedWebSearch }
}

export type ChatMessage = Message
