'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface WAIntegration {
  id: string
  device_number: string
  device_name: string
  fonnte_token: string
  is_active: boolean
  created_at: string
}

interface Props {
  personaId: string
  tenantId: string
}

export default function WAIntegration({ personaId, tenantId }: Props) {
  const [integrations, setIntegrations] = useState<WAIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fonnteToken: '', deviceNumber: '', deviceName: '' })
  const [error, setError] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/wa/webhook`)
    loadIntegrations()
  }, [])

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    }
  }

  async function loadIntegrations() {
    setLoading(true)
    const headers = await getAuthHeaders()
    const res = await fetch(`/api/wa/integrations?personaId=${personaId}`, { headers })
    if (res.ok) setIntegrations(await res.json())
    setLoading(false)
  }

  async function addIntegration() {
    if (!form.fonnteToken || !form.deviceNumber) return
    setSaving(true); setError('')
    const headers = await getAuthHeaders()
    const res = await fetch('/api/wa/integrations', {
      method: 'POST', headers,
      body: JSON.stringify({ personaId, tenantId, ...form }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Gagal menambahkan'); setSaving(false); return }
    setForm({ fonnteToken: '', deviceNumber: '', deviceName: '' })
    setShowAdd(false); setSaving(false)
    loadIntegrations()
  }

  async function deleteIntegration(id: string) {
    if (!confirm('Hapus integrasi WA ini?')) return
    const headers = await getAuthHeaders()
    await fetch(`/api/wa/integrations?id=${id}`, { method: 'DELETE', headers })
    setIntegrations(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>📱 Integrasi WhatsApp</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>AI persona aktif menjawab pesan WA secara otomatis</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: '8px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          + Hubungkan WA
        </button>
      </div>

      {/* Webhook URL info */}
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 6 }}>🔗 Webhook URL untuk Fonnte</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ flex: 1, fontSize: 12, color: '#166534', background: '#dcfce7', padding: '6px 10px', borderRadius: 6, wordBreak: 'break-all' }}>
            {webhookUrl}
          </code>
          <button onClick={() => navigator.clipboard.writeText(webhookUrl)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #86efac', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#15803d', flexShrink: 0 }}>
            Copy
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#15803d', margin: '8px 0 0' }}>
          Pasang URL ini di <strong>Fonnte → Device → Webhook</strong> untuk setiap device yang terhubung
        </p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1.5px solid #25D366', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Hubungkan Device WA</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Token Fonnte *</label>
              <input value={form.fonnteToken} onChange={e => setForm(p => ({ ...p, fonnteToken: e.target.value }))}
                placeholder="Token dari Fonnte dashboard"
                type="password"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Fonnte → Account → Token</p>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nomor WA Device *</label>
              <input value={form.deviceNumber} onChange={e => setForm(p => ({ ...p, deviceNumber: e.target.value }))}
                placeholder="628123456789 (tanpa + atau -)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nama Device (opsional)</label>
              <input value={form.deviceName} onChange={e => setForm(p => ({ ...p, deviceName: e.target.value }))}
                placeholder="e.g. WA Klinik Utama"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => { setShowAdd(false); setError('') }} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13 }}>Batal</button>
              <button onClick={addIntegration} disabled={!form.fonnteToken || !form.deviceNumber || saving}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: form.fonnteToken && form.deviceNumber ? '#25D366' : '#e2e8f0', color: form.fonnteToken && form.deviceNumber ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 13, cursor: form.fonnteToken && form.deviceNumber ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Memverifikasi...' : '✓ Hubungkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>Memuat...</div>
      ) : integrations.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Belum ada device WA yang terhubung</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {integrations.map(intg => (
            <div key={intg.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📱</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{intg.device_name || intg.device_number}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{intg.device_number}</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: intg.is_active ? '#dcfce7' : '#fee2e2', color: intg.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {intg.is_active ? '● Aktif' : '○ Nonaktif'}
                </span>
              </div>
              <button onClick={() => deleteIntegration(intg.id)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step by step guide */}
      {integrations.length > 0 && (
        <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>📋 Langkah aktivasi di Fonnte</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#78350f', lineHeight: 2 }}>
            <li>Login ke <strong>app.fonnte.com</strong></li>
            <li>Pilih device yang sudah terhubung</li>
            <li>Klik tab <strong>Webhook</strong></li>
            <li>Paste URL webhook di atas</li>
            <li>Centang <strong>Active</strong> → Save</li>
          </ol>
        </div>
      )}
    </div>
  )
}
