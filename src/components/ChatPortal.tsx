'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Tenant, Message } from '@/lib/types'

interface Props { tenant: Tenant }

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function getSessionId() {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('sapa_session')
  if (!id) { id = generateSessionId(); sessionStorage.setItem('sapa_session', id) }
  return id
}

// Quick reply suggestions per industry
const QUICK_REPLIES: Record<string, string[]> = {
  politik: ['Apa program kerja utama?', 'Bagaimana cara dapat bantuan?', 'Jadwal reses kapan?', 'Cara lapor aspirasi?'],
  kesehatan: ['Jadwal dokter hari ini?', 'Cara daftar berobat?', 'Layanan apa yang tersedia?', 'Biaya pemeriksaan?'],
  pendidikan: ['Cara daftar program?', 'Biaya kursus berapa?', 'Jadwal belajar?', 'Ada beasiswa?'],
  umkm: ['Harga produk?', 'Cara pesan?', 'Lokasi toko?', 'Ada diskon?'],
  keagamaan: ['Jadwal kajian?', 'Cara daftar program?', 'Info kegiatan terbaru?', 'Cara donasi?'],
  properti: ['Harga unit?', 'Simulasi KPR?', 'Unit tersedia?', 'Lokasi projek?'],
  organisasi: ['Cara bergabung?', 'Program apa saja?', 'Jadwal kegiatan?', 'Syarat keanggotaan?']
}

export default function ChatPortal({ tenant }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', location: '' })
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionId = useRef(getSessionId())

  const quickReplies = QUICK_REPLIES[tenant.industry] || QUICK_REPLIES.organisasi

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages, loading])

  // Check if should show lead capture
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user').length
    if (userMessages >= tenant.capture_lead_after && !leadCaptured && messages.length > 0) {
      setShowLeadCapture(true)
    }
  }, [messages, tenant.capture_lead_after, leadCaptured])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setShowQuickReplies(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          messages: newMessages,
          sessionId: sessionId.current,
          conversationId
        })
      })

      const data = await res.json()
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        if (data.conversationId && !conversationId) setConversationId(data.conversationId)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, ada gangguan teknis. Silakan coba lagi dalam beberapa saat.'
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, tenant.slug, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadForm.name || !leadForm.phone) return
    setLeadSubmitting(true)

    const lastTopic = messages.filter(m => m.role === 'user').slice(-1)[0]?.content

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          conversationId,
          name: leadForm.name,
          phone: leadForm.phone,
          location: leadForm.location,
          topic: lastTopic?.substring(0, 100)
        })
      })
      setLeadCaptured(true)
      setShowLeadCapture(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Terima kasih ${leadForm.name}! 😊 Nomor kamu sudah tersimpan. Kami akan menghubungi kamu kalau ada info penting terbaru.`
      }])
    } catch {
      setLeadCaptured(true)
      setShowLeadCapture(false)
    } finally {
      setLeadSubmitting(false)
    }
  }

  const primaryColor = tenant.primary_color || '#2563eb'
  const secondaryColor = tenant.secondary_color || '#1e40af'

  return (
    <div
      className="chat-container bg-gray-50"
      style={{ '--primary': primaryColor, '--secondary': secondaryColor } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold overflow-hidden">
            {tenant.persona_avatar_url
              ? <img src={tenant.persona_avatar_url} alt={tenant.persona_name} className="w-full h-full object-cover" />
              : tenant.persona_name[0]
            }
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">{tenant.persona_name}</div>
          <div className="text-xs opacity-80 truncate">
            Asisten {tenant.owner_name}
            {tenant.owner_title ? ` · ${tenant.owner_title}` : ''}
          </div>
        </div>
        {tenant.owner_photo_url && (
          <img
            src={tenant.owner_photo_url}
            alt={tenant.owner_name}
            className="w-8 h-8 rounded-full object-cover border-2 border-white/40"
          />
        )}
      </div>

      {/* Messages */}
      <div className="messages-area px-4 py-4 space-y-3">

        {/* Welcome message */}
        <div className="flex gap-2 items-end message-bubble">
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ background: primaryColor }}
          >
            {tenant.persona_name[0]}
          </div>
          <div className="max-w-[78%]">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm text-gray-800 leading-relaxed">
              {tenant.welcome_message}
            </div>
            <div className="text-xs text-gray-400 mt-1 ml-2">Sekarang</div>
          </div>
        </div>

        {/* Quick replies */}
        {showQuickReplies && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-9 pb-1 message-bubble">
            {quickReplies.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full border bg-white shadow-sm hover:shadow transition-all active:scale-95"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 items-end message-bubble ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: primaryColor }}
              >
                {tenant.persona_name[0]}
              </div>
            )}
            <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm chat-prose ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm'
                }`}
                style={msg.role === 'user' ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : {}}
              >
                {msg.role === 'assistant'
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content
                }
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 items-end message-bubble">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: primaryColor }}
            >
              {tenant.persona_name[0]}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
              <div className="typing-dot w-2 h-2 rounded-full bg-gray-400"></div>
              <div className="typing-dot w-2 h-2 rounded-full bg-gray-400"></div>
              <div className="typing-dot w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Lead capture modal */}
      {showLeadCapture && (
        <div className="absolute inset-0 bg-black/50 flex items-end justify-center z-20 px-4 pb-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl animate-slide-up">
            <div
              className="w-12 h-1 rounded-full mx-auto mb-4"
              style={{ background: primaryColor }}
            ></div>
            <h3 className="font-semibold text-gray-800 text-center mb-1">
              {tenant.lead_capture_text}
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              Kami akan mengirimkan info penting dan update program terbaru
            </p>
            <form onSubmit={submitLead} className="space-y-3">
              <input
                type="text"
                placeholder="Nama lengkap *"
                required
                value={leadForm.name}
                onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <input
                type="tel"
                placeholder="Nomor WhatsApp *"
                required
                value={leadForm.phone}
                onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
              <input
                type="text"
                placeholder="Kelurahan / Kecamatan (opsional)"
                value={leadForm.location}
                onChange={e => setLeadForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
              <button
                type="submit"
                disabled={leadSubmitting}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {leadSubmitting ? 'Menyimpan...' : 'Simpan & Lanjut Chat'}
              </button>
              <button
                type="button"
                onClick={() => { setShowLeadCapture(false); setLeadCaptured(true) }}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                Lewati
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 max-h-28 leading-relaxed"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">
          Powered by <span style={{ color: primaryColor }}>SapaCerdas AI</span>
        </p>
      </div>
    </div>
  )
}
