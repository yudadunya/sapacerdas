export interface Tenant {
  id: string
  slug: string
  name: string
  owner_name: string
  owner_title?: string
  owner_photo_url?: string
  persona_name: string
  persona_avatar_url?: string
  primary_color: string
  secondary_color: string
  welcome_message: string
  system_prompt: string
  industry: string
  google_sheet_url?: string
  capture_lead_after: number
  lead_capture_text: string
  is_active: boolean
  created_at: string
}

export interface Lead {
  id: string
  tenant_id: string
  conversation_id?: string
  name: string
  phone: string
  location?: string
  topic?: string
  source: string
  created_at: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
}

export interface KnowledgeChunk {
  id: string
  tenant_id: string
  title?: string
  content: string
  source?: string
  created_at: string
}

export interface Conversation {
  id: string
  tenant_id: string
  session_id: string
  message_count: number
  main_topic?: string
  started_at: string
}

export type Industry = 'politik' | 'kesehatan' | 'pendidikan' | 'umkm' | 'keagamaan' | 'properti' | 'organisasi'

export const INDUSTRY_LABELS: Record<Industry, string> = {
  politik: 'Politik & Pemerintahan',
  kesehatan: 'Kesehatan',
  pendidikan: 'Pendidikan',
  umkm: 'UMKM & Bisnis',
  keagamaan: 'Keagamaan',
  properti: 'Properti',
  organisasi: 'Organisasi & Komunitas'
}
