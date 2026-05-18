'use client'

import { useState, useEffect } from 'react'
import { Tenant, Lead } from '@/lib/types'
import { INDUSTRY_LABELS } from '@/lib/types'

interface Analytics {
  totalLeads: number
  totalConversations: number
  totalMessages: number
  cacheRatio: number
  estimatedCost: string
  recentLeads: Lead[]
  topicBreakdown: Record<string, number>
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'overview' | 'leads' | 'knowledge' | 'settings'>('overview')
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', source: '' })
  const [newTenant, setNewTenant] = useState({
    slug: '', name: '', owner_name: '', owner_title: '',
    persona_name: 'Sari', primary_color: '#2563eb', secondary_color: '#1e40af',
    welcome_message: 'Halo! Ada yang bisa saya bantu hari ini? 😊',
    system_prompt: 'Kamu adalah asisten AI yang membantu masyarakat dengan ramah dan informatif.',
    industry: 'politik', capture_lead_after: 3,
    lead_capture_text: 'Boleh saya simpan nomor WhatsApp kamu agar bisa mengirim info terbaru?'
  })
  const [showNewTenant, setShowNewTenant] = useState(false)

  const headers = { 'x-admin-secret': secret, 'Content-Type': 'application/json' }

  async function login() {
    const res = await fetch('/api/tenants', { headers: { 'x-admin-secret': secret } })
    if (res.ok) {
      const data = await res.json()
      setTenants(data.tenants || [])
      setAuthed(true)
    } else {
      alert('Password salah')
    }
  }

  async function loadTenant(tenant: Tenant) {
    setSelectedTenant(tenant)
    setLoading(true)
    const [analyticsRes, leadsRes] = await Promise.all([
      fetch(`/api/analytics?tenant=${tenant.slug}`, { headers }),
      fetch(`/api/leads?tenant=${tenant.slug}`, { headers })
    ])
    const [analyticsData, leadsData] = await Promise.all([analyticsRes.json(), leadsRes.json()])
    setAnalytics(analyticsData)
    setLeads(leadsData.leads || [])
    setLoading(false)
  }

  async function createTenant() {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers,
      body: JSON.stringify(newTenant)
    })
    if (res.ok) {
      const data = await res.json()
      setTenants(prev => [data.tenant, ...prev])
      setShowNewTenant(false)
    } else {
      const err = await res.json()
      alert('Error: ' + err.error)
    }
  }

  async function addKnowledge() {
    if (!selectedTenant || !newKnowledge.content) return
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId: selectedTenant.id, ...newKnowledge })
    })
    if (res.ok) {
      alert('Knowledge berhasil ditambahkan!')
      setNewKnowledge({ title: '', content: '', source: '' })
    }
  }

  async function syncGoogleSheet() {
    if (!selectedTenant?.google_sheet_url) return alert('Belum ada Google Sheet URL')
    const res = await fetch('/api/knowledge', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ tenantId: selectedTenant.id, sheetUrl: selectedTenant.google_sheet_url })
    })
    const data = await res.json()
    if (data.success) alert(`Berhasil sync ${data.chunks} chunks dari Google Sheet!`)
    else alert('Gagal sync: ' + data.error)
  }

  function exportLeadsCSV() {
    if (!leads.length) return
    const csv = [
      ['Nama', 'Nomor WA', 'Lokasi', 'Topik', 'Tanggal'].join(','),
      ...leads.map(l => [l.name, l.phone, l.location || '', l.topic || '', new Date(l.created_at).toLocaleDateString('id')].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${selectedTenant?.slug}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-gray-800">
          <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            SapaCerdas
          </div>
          <p className="text-gray-400 text-sm mb-6">Admin Dashboard</p>
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-semibold transition"
          >
            Masuk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="flex h-screen">
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>SapaCerdas</div>
            <div className="text-xs text-gray-400">Admin Dashboard</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-2">Tenant Aktif</div>
            {tenants.map(t => (
              <button
                key={t.id}
                onClick={() => loadTenant(t)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                  selectedTenant?.id === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium truncate">{t.owner_name}</div>
                <div className="text-xs opacity-60 truncate">{t.slug} · {INDUSTRY_LABELS[t.industry as keyof typeof INDUSTRY_LABELS]}</div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-800">
            <button
              onClick={() => setShowNewTenant(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition"
            >
              + Tambah Tenant
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTenant ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Pilih tenant untuk melihat dashboard
            </div>
          ) : (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold">{selectedTenant.owner_name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">
                      {selectedTenant.slug}
                    </span>
                    <a
                      href={`/portal/${selectedTenant.slug}`}
                      target="_blank"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Buka portal ↗
                    </a>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
                  {(['overview', 'leads', 'knowledge', 'settings'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                        tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-gray-500 text-sm">Memuat data...</div>
              ) : (
                <>
                  {/* OVERVIEW TAB */}
                  {tab === 'overview' && analytics && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Total Leads', value: analytics.totalLeads, color: 'text-green-400' },
                          { label: 'Percakapan', value: analytics.totalConversations, color: 'text-blue-400' },
                          { label: 'Total Pesan', value: analytics.totalMessages, color: 'text-purple-400' },
                          { label: 'Cache Ratio', value: `${analytics.cacheRatio}%`, color: 'text-yellow-400' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <div className="text-sm font-medium mb-3">Estimasi Biaya AI</div>
                        <div className="text-3xl font-bold text-green-400">${analytics.estimatedCost}</div>
                        <div className="text-xs text-gray-400 mt-1">Total biaya Claude API (cache menghemat {analytics.cacheRatio}%)</div>
                      </div>

                      {/* Topic breakdown */}
                      {Object.keys(analytics.topicBreakdown).length > 0 && (
                        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                          <div className="text-sm font-medium mb-3">Topik yang Ditanyakan</div>
                          <div className="space-y-2">
                            {Object.entries(analytics.topicBreakdown).map(([topic, count]) => (
                              <div key={topic} className="flex items-center gap-2 text-xs">
                                <div className="flex-1 truncate text-gray-300">{topic}</div>
                                <div className="bg-blue-600 text-white px-2 py-0.5 rounded-full">{count}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent leads */}
                      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-sm font-medium">Lead Terbaru</div>
                          <button onClick={() => setTab('leads')} className="text-xs text-blue-400 hover:underline">
                            Lihat semua →
                          </button>
                        </div>
                        <div className="space-y-2">
                          {analytics.recentLeads.slice(0, 5).map((lead, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs py-2 border-b border-gray-800 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                                {lead.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-200">{lead.name}</div>
                                <div className="text-gray-500 truncate">{lead.phone}</div>
                              </div>
                              <div className="text-gray-500">{new Date(lead.created_at).toLocaleDateString('id')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LEADS TAB */}
                  {tab === 'leads' && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-800">
                      <div className="flex justify-between items-center p-4 border-b border-gray-800">
                        <div className="font-medium">Database Leads ({leads.length})</div>
                        <button
                          onClick={exportLeadsCSV}
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition"
                        >
                          Export CSV
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                              <th className="text-left px-4 py-3">Nama</th>
                              <th className="text-left px-4 py-3">Nomor WA</th>
                              <th className="text-left px-4 py-3">Lokasi</th>
                              <th className="text-left px-4 py-3">Topik</th>
                              <th className="text-left px-4 py-3">Tanggal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leads.map((lead, i) => (
                              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="px-4 py-3 font-medium">{lead.name}</td>
                                <td className="px-4 py-3 text-blue-400">{lead.phone}</td>
                                <td className="px-4 py-3 text-gray-400">{lead.location || '-'}</td>
                                <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{lead.topic || '-'}</td>
                                <td className="px-4 py-3 text-gray-500">{new Date(lead.created_at).toLocaleDateString('id')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {leads.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">Belum ada leads</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KNOWLEDGE TAB */}
                  {tab === 'knowledge' && (
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <div className="text-sm font-medium mb-4">Tambah Pengetahuan AI</div>
                        <div className="space-y-3">
                          <input
                            placeholder="Judul (contoh: Program Kerja 2025)"
                            value={newKnowledge.title}
                            onChange={e => setNewKnowledge(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                          <textarea
                            placeholder="Isi konten / informasi yang ingin AI ketahui..."
                            value={newKnowledge.content}
                            onChange={e => setNewKnowledge(p => ({ ...p, content: e.target.value }))}
                            rows={5}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <input
                              placeholder="Sumber (opsional)"
                              value={newKnowledge.source}
                              onChange={e => setNewKnowledge(p => ({ ...p, source: e.target.value }))}
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={addKnowledge}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
                            >
                              Tambah
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Google Sheets sync */}
                      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <div className="text-sm font-medium mb-2">Sync Google Sheet (Live Data)</div>
                        <p className="text-xs text-gray-400 mb-3">
                          Hubungkan Google Sheet untuk data yang selalu update (jadwal, harga, stok, dll)
                        </p>
                        <div className="flex gap-2">
                          <input
                            placeholder="URL Google Sheet (pastikan sudah di-share publik)"
                            value={selectedTenant.google_sheet_url || ''}
                            readOnly
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none"
                          />
                          <button
                            onClick={syncGoogleSheet}
                            className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
                          >
                            Sync
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SETTINGS TAB */}
                  {tab === 'settings' && (
                    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                      <div className="text-sm font-medium mb-4">Konfigurasi Portal</div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                        <div><span className="text-gray-500">Slug:</span> <span className="text-white ml-2">{selectedTenant.slug}</span></div>
                        <div><span className="text-gray-500">Industri:</span> <span className="text-white ml-2">{INDUSTRY_LABELS[selectedTenant.industry as keyof typeof INDUSTRY_LABELS]}</span></div>
                        <div><span className="text-gray-500">Persona:</span> <span className="text-white ml-2">{selectedTenant.persona_name}</span></div>
                        <div><span className="text-gray-500">Capture lead setelah:</span> <span className="text-white ml-2">{selectedTenant.capture_lead_after} pesan</span></div>
                        <div className="col-span-2"><span className="text-gray-500">URL Portal:</span> <a href={`/portal/${selectedTenant.slug}`} target="_blank" className="text-blue-400 ml-2 hover:underline">/portal/{selectedTenant.slug}</a></div>
                      </div>
                      <div className="mt-4 p-3 bg-gray-800 rounded-xl">
                        <div className="text-xs text-gray-400 mb-1">System Prompt aktif:</div>
                        <div className="text-xs text-gray-300 leading-relaxed">{selectedTenant.system_prompt}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New tenant modal */}
      {showNewTenant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Buat Tenant Baru</h2>
            <div className="space-y-3 text-sm">
              {[
                { key: 'slug', label: 'Slug URL *', placeholder: 'contoh: budi-santoso' },
                { key: 'name', label: 'Nama Portal *', placeholder: 'contoh: Asisten Pak Budi' },
                { key: 'owner_name', label: 'Nama Klien *', placeholder: 'contoh: Budi Santoso' },
                { key: 'owner_title', label: 'Jabatan', placeholder: 'contoh: Anggota DPRD' },
                { key: 'persona_name', label: 'Nama AI', placeholder: 'contoh: Sari' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{field.label}</label>
                  <input
                    placeholder={field.placeholder}
                    value={(newTenant as any)[field.key]}
                    onChange={e => setNewTenant(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Industri</label>
                <select
                  value={newTenant.industry}
                  onChange={e => setNewTenant(p => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                >
                  {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Warna Utama</label>
                  <input type="color" value={newTenant.primary_color} onChange={e => setNewTenant(p => ({ ...p, primary_color: e.target.value }))} className="w-full h-10 rounded-xl bg-gray-800 border border-gray-700 cursor-pointer" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Warna Sekunder</label>
                  <input type="color" value={newTenant.secondary_color} onChange={e => setNewTenant(p => ({ ...p, secondary_color: e.target.value }))} className="w-full h-10 rounded-xl bg-gray-800 border border-gray-700 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Pesan Sambutan AI</label>
                <textarea
                  value={newTenant.welcome_message}
                  onChange={e => setNewTenant(p => ({ ...p, welcome_message: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">System Prompt AI</label>
                <textarea
                  value={newTenant.system_prompt}
                  onChange={e => setNewTenant(p => ({ ...p, system_prompt: e.target.value }))}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNewTenant(false)} className="flex-1 bg-gray-800 text-gray-300 rounded-xl py-2.5 text-sm">
                Batal
              </button>
              <button onClick={createTenant} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium">
                Buat Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
