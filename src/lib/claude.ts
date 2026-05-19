import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from './supabase-server'
import { Message, KnowledgeChunk } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

async function checkCache(tenantId: string, question: string): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const normalized = normalizeQuestion(question)
    const hash = await hashString(normalized)

    const { data } = await supabase
      .from('response_cache')
      .select('response')
      .eq('tenant_id', tenantId)
      .eq('question_hash', hash)
      .single()

    if (data) {
      try {
        await supabase
          .from('response_cache')
          .update({ hit_count: (data as any).hit_count + 1, last_hit_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('question_hash', hash)
      } catch {}
      return data.response
    }
    return null
  } catch {
    return null
  }
}

async function saveCache(tenantId: string, question: string, response: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    const normalized = normalizeQuestion(question)
    const hash = await hashString(normalized)

    await supabase.from('response_cache').upsert({
      tenant_id: tenantId,
      question_hash: hash,
      question_sample: question.substring(0, 200),
      response,
      hit_count: 1,
      last_hit_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,question_hash' })
  } catch {}
}

export async function getRelevantKnowledge(tenantId: string, question: string): Promise<string> {
  try {
    const supabase = createServiceClient()
    const keywords = question
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 5)
      .join(' | ')

    const { data } = await supabase
      .from('knowledge_chunks')
      .select('title, content')
      .eq('tenant_id', tenantId)
      .textSearch('content', keywords, { config: 'indonesian' })
      .limit(3)

    if (!data || data.length === 0) {
      const { data: all } = await supabase
        .from('knowledge_chunks')
        .select('title, content')
        .eq('tenant_id', tenantId)
        .limit(5)

      if (!all || all.length === 0) return ''
      return all.map((c: Pick<KnowledgeChunk, 'title' | 'content'>) => `${c.title ? `## ${c.title}\n` : ''}${c.content}`).join('\n\n')
    }

    return data.map((c: Pick<KnowledgeChunk, 'title' | 'content'>) => `${c.title ? `## ${c.title}\n` : ''}${c.content}`).join('\n\n')
  } catch {
    return ''
  }
}

export async function chat(params: {
  tenantId: string
  systemPrompt: string
  messages: Message[]
  useCache?: boolean
}): Promise<{ response: string; cached: boolean; tokens: number }> {
  const { tenantId, systemPrompt, messages, useCache = true } = params
  const lastMessage = messages[messages.length - 1]

  if (useCache && lastMessage.role === 'user' && messages.length <= 4) {
    const cached = await checkCache(tenantId, lastMessage.content)
    if (cached) {
      return { response: cached, cached: true, tokens: 0 }
    }
  }

  const knowledge = await getRelevantKnowledge(tenantId, lastMessage.content)

  const fullSystemPrompt = knowledge
    ? `${systemPrompt}\n\n--- INFORMASI YANG KAMU MILIKI ---\n${knowledge}\n---\n\nGunakan informasi di atas untuk menjawab pertanyaan. Jika pertanyaan di luar informasi yang tersedia, jawab secara umum dan sarankan untuk menghubungi langsung.`
    : systemPrompt

  const model = 'claude-haiku-4-5-20251001'

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 512,
      system: fullSystemPrompt,
      messages: messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const tokens = response.usage.input_tokens + response.usage.output_tokens

    if (useCache && messages.length <= 3) {
      await saveCache(tenantId, lastMessage.content, text)
    }

    return { response: text, cached: false, tokens }
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}
