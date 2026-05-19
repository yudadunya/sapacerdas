'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Tenant, Persona } from '@/types'

export default function Dashboard() {
  const [tenants, setTenants] = useState<Array<{ role: string; tenant: Tenant }>>([])
  const [selected, setSelected] = useState<Tenant | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [stats, setStats] = useState({ sessions: 0, contacts: 0, messages: 0, cacheHits: 0 })
  const [loading, setLoading] = useState(true)
  const [showNewTenant, setShowNewTenant] = useState(false)
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' })
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    }
  }

  useEffect(() => {
    loadTenants()
  }, [])

  useEffect(() => {
    if (selected) {
      loadPersonas(selected.id)
      loadStats(selected.id)
    }
  }, [selected])

  async function loadTenants() {
    setLoading(true)
    const headers = await getAuthHeaders()
    const res = await fetch('/api/tenants', { headers })
    if (res.ok) {
      const data = await res.json()
      setTenants(data)
      if (data.length > 0) setSelected(data[0].tenant)
    }
    setLoading(false)
  }

  async function loadPersonas(tenantId: string) {
    const { data } = await supabase.from('personas').select('*').eq('tenant_id', tenantId).order('created_at')
    setPersonas(data || [])
  }

  async function loadStats(tenantId: string) {
    const [sessions, contacts, messages, cache] = await Promise.all([
      supabase.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).not('captured_at', 'is', null),
      supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('event_type', 'message_sent'),
      supabase.from('usage_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('event_type', 'cache_hit'),
    ])
    setStats({
      sessions: sessions.count || 0,
      contacts: contacts.count || 0,
      messages: messages.count || 0,
      cacheHits: cache.count || 0,
    })
  }

  async function createTenant() {
    if (!newTenant.name || !newTenant.slug) return
    setCreating(true)
    const headers = await getAuthHeaders()
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers,
      body: JSON.stringify(newTenant),
    })
    if (res.ok) {
      await loadTenants()
      setShowNewTenant(false)
      setNewTenant({ name: '', slug: '' })
    }
    setCreating(false)
  }

  const statCards = [
    { label: 'Total Sesi', value: stats.sessions, icon: '💬', color: '#3b82f6' },
    { label: 'Kontak Captured', value: stats.contacts, icon: '👥', color: '#10b981' },
    { label: 'Pesan Terproses', value: stats.messages, icon: '✉️', color: '#8b5cf6' },
    { label: 'Cache Hit', value: stats.cacheHits, icon: '⚡', color: '#f59e0b' },
  ]

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Memuat dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8fafc' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        .nav-item:hover { background: #f1f5f9; }
        .nav-item.active { background: #eff6ff; color: #1d4ed8; }
        .stat-card { animation: fadeIn 0.3s ease both; }
        .persona-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>SapaCerdas</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>White-label AI Platform</div>
        </div>

        <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          <div style={{ padding: '4px 12px 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tenant</div>
          {tenants.map(({ tenant, role }) => (
            <button
              key={tenant.id}
              className={`nav-item ${selected?.id === tenant.id ? 'active' : ''}`}
              onClick={() => setSelected(tenant)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 20px', border: 'none',
                background: 'none', cursor: 'pointer',
                fontSize: 14, color: selected?.id === tenant.id ? '#1d4ed8' : '#475569',
                fontWeight: selected?.id === tenant.id ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>
                  {tenant.name[0]}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{tenant.name}</span>
              </span>
              <span style={{ fontSize: 10, background: role === 'owner' ? '#eff6ff' : '#f1f5f9', color: role === 'owner' ? '#3b82f6' : '#64748b', borderRadius: 4, padding: '2px 6px' }}>{role}</span>
            </button>
          ))}
          <button
            onClick={() => setShowNewTenant(true)}
            style={{
              width: '100%', padding: '9px 20px', border: 'none',
              background: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 14, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#94a3b8' }}>+</span>
            Tambah Tenant
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={() => supabase.auth.signOut().then(() => location.href = '/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: 0 }}
          >
            Keluar →
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selected ? (
          <div style={{ padding: 32, maxWidth: 960 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>{selected.name}</h1>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>/{selected.slug}</span>
                  <span style={{ fontSize: 11, background: '#eff6ff', color: '#3b82f6', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>{selected.plan.toUpperCase()}</span>
                  <a href={`/${selected.slug}`} target="_blank" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>Lihat Portal ↗</a>
                </div>
              </div>
              <button
                onClick={() => location.href = `/dashboard/personas/new?tenant=${selected.id}`}
                style={{ padding: '10px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                + Buat Persona
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              {statCards.map((card, i) => (
                <div key={card.label} className="stat-card" style={{
                  background: '#fff', borderRadius: 12, padding: '20px',
                  border: '1px solid #e2e8f0',
                  animationDelay: `${i * 0.05}s`,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: card.color, letterSpacing: '-1px' }}>{card.value.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* Personas */}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>AI Persona ({personas.length})</h2>
              {personas.length === 0 ? (
                <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>Belum ada persona</div>
                  <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Buat persona AI pertama untuk tenant ini</div>
                  <button
                    onClick={() => location.href = `/dashboard/personas/new?tenant=${selected.id}`}
                    style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  >
                    Buat Persona Pertama
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {personas.map(p => (
                    <div key={p.id} className="persona-card" style={{
                      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                      overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer',
                    }}
                      onClick={() => location.href = `/dashboard/personas/${p.id}`}
                    >
                      <div style={{ height: 6, background: p.primary_color }} />
                      <div style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: p.primary_color + '22',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20, fontWeight: 700, color: p.primary_color,
                            overflow: 'hidden',
                          }}>
                            {p.avatar_url ? <img src={p.avatar_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{p.name}</div>
                            {p.tagline && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{p.tagline}</div>}
                          </div>
                          <div style={{ marginLeft: 'auto' }}>
                            <span style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 20,
                              background: p.is_active ? '#dcfce7' : '#fee2e2',
                              color: p.is_active ? '#16a34a' : '#dc2626', fontWeight: 600,
                            }}>
                              {p.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, display: 'flex', gap: 12 }}>
                          <span>Tone: {p.tone}</span>
                          <span>Bahasa: {p.language === 'id' ? 'Indonesia' : p.language}</span>
                        </div>
                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <a href={`/${selected.slug}?persona=${p.id}`} target="_blank"
                            style={{ flex: 1, padding: '8px', background: p.primary_color, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}
                            onClick={e => e.stopPropagation()}
                          >
                            Buka Portal ↗
                          </a>
                          <button style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#475569' }}
                            onClick={e => { e.stopPropagation(); location.href = `/dashboard/personas/${p.id}` }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>👈</div>
              <div style={{ fontSize: 16, color: '#64748b' }}>Pilih tenant di sidebar</div>
            </div>
          </div>
        )}
      </div>

      {/* New Tenant Modal */}
      {showNewTenant && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }} onClick={() => setShowNewTenant(false)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32, width: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Buat Tenant Baru</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Setiap klien = 1 tenant dengan brand & persona sendiri</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nama Tenant *</label>
                <input
                  value={newTenant.name}
                  onChange={e => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                    setNewTenant({ name, slug })
                  }}
                  placeholder="e.g. Klinik Sehat Mandiri"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>URL Slug *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', background: '#f8fafc', fontSize: 14, color: '#94a3b8', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    yourapp.com/
                  </span>
                  <input
                    value={newTenant.slug}
                    onChange={e => setNewTenant(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="klinik-sehat"
                    style={{ flex: 1, padding: '10px 12px', border: 'none', fontSize: 14, outline: 'none' }}
                  />
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Huruf kecil, angka, dan tanda hubung saja</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowNewTenant(false)} style={{ flex: 1, padding: '11px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', fontSize: 14, cursor: 'pointer', color: '#475569' }}>
                Batal
              </button>
              <button
                onClick={createTenant}
                disabled={!newTenant.name || !newTenant.slug || creating}
                style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                  background: newTenant.name && newTenant.slug ? '#1d4ed8' : '#e2e8f0',
                  color: newTenant.name && newTenant.slug ? '#fff' : '#94a3b8',
                  fontWeight: 600, fontSize: 14, cursor: newTenant.name && newTenant.slug ? 'pointer' : 'not-allowed',
                }}
              >
                {creating ? 'Membuat...' : 'Buat Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
