'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Persona, Tenant } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  fromCache?: boolean
  enriched?: boolean
}

interface Props { params: { tenant: string } }

function formatTime(d = new Date()) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPortal({ params }: Props) {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [captureData, setCaptureData] = useState({ name: '', phone: '', location: '' })
  const [captured, setCaptured] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { initSession() }, [params.tenant])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === 'user').length
    if (userMsgs >= 3 && !captured && !showCapture) setShowCapture(true)
  }, [messages])

  async function initSession() {
    const { data: tenantData } = await supabase.from('tenants').select('*').eq('slug', params.tenant).eq('is_active', true).single()
    if (!tenantData) { setInitializing(false); return }
    setTenant(tenantData)
    const { data: personaData } = await supabase.from('personas').select('*').eq('tenant_id', tenantData.id).eq('is_active', true).order('created_at').limit(1).single()
    if (!personaData) { setInitializing(false); return }
    setPersona(personaData)
    const visitorId = localStorage.getItem('sc_visitor') || crypto.randomUUID()
    localStorage.setItem('sc_visitor', visitorId)
    const { data: session } = await supabase.from('chat_sessions').insert({ persona_id: personaData.id, tenant_id: tenantData.id, visitor_id: visitorId }).select().single()
    if (session) {
      setSessionId(session.id)
      setMessages([{ id: 'welcome', role: 'assistant', content: personaData.welcome_message, time: formatTime() }])
    }
    setInitializing(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading || !sessionId || !persona) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), time: formatTime() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    inputRef.current?.focus()
    const allMessages = [...messages, userMsg].filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }))
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, personaId: persona.id, messages: allMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.text || 'Maaf, ada masalah. Coba lagi ya.', time: formatTime(), fromCache: data.fromCache, enriched: data.enrichedWith === 'web_search' }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Koneksi bermasalah. Coba lagi ya 🙏', time: formatTime() }])
    } finally { setLoading(false) }
  }

  async function submitCapture() {
    if (!sessionId || !captureData.name) return
    await supabase.from('chat_sessions').update({ contact_name: captureData.name, contact_phone: captureData.phone, contact_location: captureData.location, captured_at: new Date().toISOString() }).eq('id', sessionId)
    setCaptured(true); setShowCapture(false)
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Makasih ${captureData.name}! 😊 Data kamu sudah tersimpan. Kalau ada info penting, saya kabarin ya.`, time: formatTime() }])
  }

  const pc = persona?.primary_color || '#25D366'

  if (initializing) return (
    <div style={{ height: '100vh', background: '#ECE5DD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${pc}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#667781', fontSize: 14, fontFamily: 'sans-serif' }}>Memuat percakapan...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!persona || !tenant) return (
    <div style={{ height: '100vh', background: '#ECE5DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 56, marginBottom: 16 }}>💬</div><h2 style={{ fontSize: 20, color: '#1f2937' }}>Chat tidak tersedia</h2></div>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes msgIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.msg-in{animation:msgIn 0.18s ease}.send-btn:active{transform:scale(0.92)}`}</style>

      {/* Header */}
      <div style={{ background: pc, color: '#fff', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
          {persona.avatar_url ? <img src={persona.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : persona.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>{persona.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />online
          </div>
        </div>
        {persona.tagline && <div style={{ fontSize: 11, opacity: 0.75, maxWidth: 100, textAlign: 'right', lineHeight: 1.3 }}>{persona.tagline}</div>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <span style={{ background: 'rgba(255,255,255,0.85)', fontSize: 11.5, color: '#667781', padding: '4px 12px', borderRadius: 8 }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const showTail = i === 0 || messages[i-1]?.role !== msg.role
          return (
            <div key={msg.id} className="msg-in" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '1px 8px' }}>
              <div style={{ maxWidth: '78%', background: isUser ? '#DCF8C6' : '#ffffff', borderRadius: isUser ? (showTail ? '12px 2px 12px 12px' : '12px 12px 2px 12px') : (showTail ? '2px 12px 12px 12px' : '12px 12px 12px 2px'), padding: '7px 10px 5px 10px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: 14.5, color: '#1f2937', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                  {msg.enriched && <span style={{ fontSize: 10, color: '#25D366' }} title="Info terkini">🌐</span>}
                  <span style={{ fontSize: 11, color: '#8696a0' }}>{msg.time}</span>
                  {isUser && <span style={{ fontSize: 12, color: '#53bdeb' }}>✓✓</span>}
                </div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="msg-in" style={{ display: 'flex', justifyContent: 'flex-start', padding: '1px 8px' }}>
            <div style={{ background: '#fff', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#8696a0', animation: `pulse 1.2s ease-in-out ${d}s infinite` }} />)}
            </div>
          </div>
        )}

        {showCapture && !captured && (
          <div className="msg-in" style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 8px' }}>
            <div style={{ maxWidth: '88%', background: '#fff', borderRadius: '2px 12px 12px 12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
              <p style={{ fontSize: 14, color: '#1f2937', margin: '0 0 4px', fontWeight: 500 }}>Boleh simpan kontakmu? 📱</p>
              <p style={{ fontSize: 13, color: '#667781', margin: '0 0 12px', lineHeight: 1.4 }}>Biar saya bisa kasih info penting yang relevan buat kamu.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={captureData.name} onChange={e => setCaptureData(p => ({ ...p, name: e.target.value }))} placeholder="Nama kamu *" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                <input value={captureData.phone} onChange={e => setCaptureData(p => ({ ...p, phone: e.target.value }))} placeholder="Nomor WhatsApp" type="tel" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                <input value={captureData.location} onChange={e => setCaptureData(p => ({ ...p, location: e.target.value }))} placeholder="Kelurahan/Kecamatan (opsional)" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button onClick={() => setShowCapture(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'none', fontSize: 13, cursor: 'pointer', color: '#667781' }}>Nanti</button>
                  <button onClick={submitCapture} disabled={!captureData.name} style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: captureData.name ? pc : '#e5e7eb', color: captureData.name ? '#fff' : '#9ca3af', fontWeight: 600, fontSize: 13, cursor: captureData.name ? 'pointer' : 'not-allowed' }}>Simpan ✓</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: 8 }} />
      </div>

      {/* Input */}
      <div style={{ background: '#F0F2F5', padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', padding: '0 16px', height: 44, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Ketik pesan" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1f2937', background: 'transparent' }} />
        </div>
        <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}
          style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: input.trim() && !loading ? pc : '#c4c4c4', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )
}
