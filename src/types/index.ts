export type Plan = 'starter' | 'growth' | 'pro'
export type Tone = 'formal' | 'friendly' | 'casual'
export type Role = 'owner' | 'admin' | 'viewer'
export type MessageRole = 'user' | 'assistant'
export type SourceType = 'manual' | 'upload' | 'gsheet' | 'scrape'

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: Plan
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Persona {
  id: string
  tenant_id: string
  name: string
  tagline?: string
  avatar_url?: string
  primary_color: string
  font_family: string
  system_prompt: string
  welcome_message: string
  topics_allowed: string[]
  escalation_message: string
  language: string
  tone: Tone
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface KnowledgeItem {
  id: string
  persona_id: string
  tenant_id: string
  title: string
  content: string
  source_type: SourceType
  source_url?: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
}

export interface ChatSession {
  id: string
  persona_id: string
  tenant_id: string
  visitor_id?: string
  contact_name?: string
  contact_phone?: string
  contact_location?: string
  extra_data: Record<string, unknown>
  captured_at?: string
  message_count: number
  created_at: string
  last_active_at: string
}

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  from_cache: boolean
  tokens_used: number
  created_at: string
}

export interface PersonaWithTenant extends Persona {
  tenant: Tenant
}

export interface ChatConfig {
  persona: Persona
  tenant: Tenant
  knowledgeItems: KnowledgeItem[]
}

export const PLAN_LIMITS: Record<Plan, {
  personas: number
  messagesPerMonth: number
  knowledgeDocs: number
  capturePerMonth: number
  customDomain: boolean
  gsheetSync: boolean
  analytics: boolean
}> = {
  starter: {
    personas: 1,
    messagesPerMonth: 3000,
    knowledgeDocs: 5,
    capturePerMonth: 500,
    customDomain: false,
    gsheetSync: false,
    analytics: false,
  },
  growth: {
    personas: 3,
    messagesPerMonth: 15000,
    knowledgeDocs: 20,
    capturePerMonth: 3000,
    customDomain: true,
    gsheetSync: true,
    analytics: true,
  },
  pro: {
    personas: 10,
    messagesPerMonth: 99999,
    knowledgeDocs: 999,
    capturePerMonth: 99999,
    customDomain: true,
    gsheetSync: true,
    analytics: true,
  },
}
