'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Persona {
  id: string
  tenant_id: string
  name: string
  tagline?: string
  primary_color: string
  system_prompt: string
  welcome_message: string
  tone: string
  is_active: boolean
}

interface KnowledgeItem {
  id: string
  title: string
  content: string
  source_type: string
  is_active: boolean
  created_at: string
}

interface Props {
  params: { id: string }
}

export default function EditPersonaPage({ params }: Props) {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [tab, setTab] = useState<'persona' | 'knowledge'>('persona')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', content: '' })
  const [addingItem, setAddingItem] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('personas').select('*').eq('id', params.id).single()
    if (p) setPersona(p)
    const { data: k } = await supabase.from('knowledge_items').select('*').eq('persona_id', params.id).order('created_at', { ascending: false })
    setKnowledge(k || [])
    setLoading(false)
  }

  async function savePersona() {
    if (!persona) return
    setSaving(true)
    await supabase.from('personas').update({
      name: persona.name,
      tagline: persona.tagline,
      primary_color: persona.primary_color,
      system_prompt: persona.system_prompt,
      welcome_message: persona.welcome_message,
      tone: persona.tone,
      is_active: persona.is_active,
    }).eq('id', persona.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addKnowledge() {
    if (!newItem.title || !newItem.content || !persona) return
    setAddingItem(true)
    await supabase.from('knowledge_items').insert({
      persona_id: persona.id,
      tenant_id: persona.tenant_id,
      title: newItem.title,
      content: newItem.content,
      source_type: 'manual',
      is_active: true,
    })
    setNewItem({ title: '', content: '' })
    setShowAddKnowledge(false)
    setAddingItem(false)
    loadData()
  }

  async function deleteKnowledge(id: string) {
    await supabase.from('knowledge_items').delete().eq('id', id)
    setKnowledge(prev => prev.filter(k => k.id !== id))
  }

  async function toggleKnowledge(id: string, current: boolean) {
    await supabase.from('knowledge_items').update({ is_active: !current }).eq('id', id)
    setKnowledge(prev => prev.map(k => k.id === id ? { ...k, is_active: !current } : k))
  }

  const colors = ['#2563eb', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!persona) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <p style={{ color: '#64748b' }}>Persona tidak ditemukan. <a href="/dashboard" style={{ color: '#2563eb' }}>Kembali</a></p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b', padding: 0 }}>← Kembali</button>
          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: persona.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{persona.name[0]}</div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{persona.name}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: persona.is_active ? '#dcfce7' : '#fee2e2', color: persona.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              {persona.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
        <a href={`/${persona.tenant_id}`} target="_blank" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', padding: '6px 14px', border: '1px solid #2563eb', borderRadius: 8 }}>
          Buka Portal ↗
        </a>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: 0 }}>
        {[
          { id: 'persona', label: '⚙️ Pengaturan Persona' },
          { id: 'knowledge', label: `📚 Knowledge Base (${knowledge.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '12px 20px', border: 'none', borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? '#2563eb' : '#64748b', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* PERSONA TAB */}
        {tab === 'persona' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nama Asisten</label>
                <input value={persona.name} onChange={e => setPersona(p => p ? { ...p, name: e.target.value } : p)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tagline</label>
                <input value={persona.tagline || ''} onChange={e => setPersona(p => p ? { ...p, tagline: e.target.value } : p)}
                  placeholder="e.g. Asisten Digital Klinik Sehat"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Warna Brand</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {colors.map(c => (
                  <button key={c} onClick={() => setPersona(p => p ? { ...p, primary_color: c } : p)}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: persona.primary_color === c ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tone Bicara</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'friendly', label: '😊 Ramah' }, { id: 'formal', label: '👔 Formal' }, { id: 'casual', label: '✌️ Santai' }].map(t => (
                  <button key={t.id} onClick={() => setPersona(p => p ? { ...p, tone: t.id } : p)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${persona.tone === t.id ? '#2563eb' : '#e2e8f0'}`, background: persona.tone === t.id ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: persona.tone === t.id ? 600 : 400, color: persona.tone === t.id ? '#1d4ed8' : '#475569' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Pesan Sambutan</label>
              <input value={persona.welcome_message} onChange={e => setPersona(p => p ? { ...p, welcome_message: e.target.value } : p)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>System Prompt</label>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Instruksi utama yang menentukan karakter dan kemampuan AI</p>
              <textarea value={persona.system_prompt} onChange={e => setPersona(p => p ? { ...p, system_prompt: e.target.value } : p)}
                rows={10}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Status Persona</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Nonaktifkan untuk menyembunyikan dari portal</div>
              </div>
              <button onClick={() => setPersona(p => p ? { ...p, is_active: !p.is_active } : p)}
                style={{ width: 48, height: 26, borderRadius: 13, background: persona.is_active ? '#2563eb' : '#e2e8f0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: persona.is_active ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            <button onClick={savePersona} disabled={saving}
              style={{ padding: '13px', borderRadius: 10, border: 'none', background: saved ? '#10b981' : '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.3s' }}>
              {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan!' : 'Simpan Perubahan'}
            </button>
          </div>
        )}

        {/* KNOWLEDGE TAB */}
        {tab === 'knowledge' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Knowledge Base</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Informasi yang dipakai AI untuk menjawab pertanyaan</p>
              </div>
              <button onClick={() => setShowAddKnowledge(true)}
                style={{ padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                + Tambah Info
              </button>
            </div>

            {showAddKnowledge && (
              <div style={{ background: '#fff', border: '1.5px solid #2563eb', borderRadius: 12, padding: 20, marginBottom: 20, animation: 'fadeIn 0.2s ease' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Tambah Informasi Baru</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))}
                    placeholder="Judul (e.g. Jam Operasional, Tarif Layanan)"
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                  <textarea value={newItem.content} onChange={e => setNewItem(p => ({ ...p, content: e.target.value }))}
                    placeholder="Isi informasi selengkap mungkin. Semakin detail, semakin akurat jawaban AI."
                    rows={6}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowAddKnowledge(false)} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 14 }}>Batal</button>
                    <button onClick={addKnowledge} disabled={!newItem.title || !newItem.content || addingItem}
                      style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: newItem.title && newItem.content ? '#1d4ed8' : '#e2e8f0', color: newItem.title && newItem.content ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 14, cursor: newItem.title && newItem.content ? 'pointer' : 'not-allowed' }}>
                      {addingItem ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {knowledge.length === 0 ? (
              <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>Belum ada knowledge base</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Tambahkan informasi agar AI bisa menjawab lebih akurat</div>
                <button onClick={() => setShowAddKnowledge(true)}
                  style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  + Tambah Informasi Pertama
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {knowledge.map(item => (
                  <div key={item.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${item.is_active ? '#e2e8f0' : '#fecaca'}`, padding: '16px 20px', opacity: item.is_active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{item.title}</span>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: item.source_type === 'scrape' ? '#eff6ff' : '#f1f5f9', color: item.source_type === 'scrape' ? '#2563eb' : '#64748b', fontWeight: 500 }}>
                            {item.source_type === 'scrape' ? '🌐 Auto' : '✍️ Manual'}
                          </span>
                          {!item.is_active && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#fee2e2', color: '#dc2626', fontWeight: 500 }}>Nonaktif</span>}
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.content}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => toggleKnowledge(item.id, item.is_active)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
                          {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button onClick={() => deleteKnowledge(item.id)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
