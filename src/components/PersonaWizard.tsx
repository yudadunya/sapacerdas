'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const VERTICALS = [
  { id: 'dprd', icon: '🏛️', label: 'DPRD / Anggota Dewan', desc: 'Layani konstituen, info dapil, aspirasi warga' },
  { id: 'klinik', icon: '🏥', label: 'Klinik / Kesehatan', desc: 'Info layanan, jadwal dokter, konsultasi awal' },
  { id: 'masjid', icon: '🕌', label: 'Masjid / Pesantren', desc: 'Jadwal sholat, kajian, tanya jawab agama' },
  { id: 'umkm', icon: '🛍️', label: 'UMKM / Toko', desc: 'Produk, harga, pemesanan, customer service' },
  { id: 'sekolah', icon: '🎓', label: 'Sekolah / Bimbel', desc: 'Info pendaftaran, jadwal, prestasi' },
  { id: 'desa', icon: '🏘️', label: 'Desa / Kelurahan', desc: 'Layanan administrasi, info wilayah, pengaduan' },
  { id: 'custom', icon: '⚙️', label: 'Lainnya', desc: 'Sesuaikan sendiri' },
]

const TONES = [
  { id: 'friendly', label: 'Ramah & Hangat', emoji: '😊', desc: 'Seperti teman yang membantu' },
  { id: 'formal', label: 'Formal & Profesional', emoji: '👔', desc: 'Resmi dan berwibawa' },
  { id: 'casual', label: 'Santai & Gaul', emoji: '✌️', desc: 'Asik dan mudah diajak bicara' },
]

interface Props {
  tenantId: string
  onCreated: () => void
}

export default function PersonaWizard({ tenantId, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    name: '',
    vertical: '',
    orgName: '',
    region: '',
    tone: 'friendly',
    primaryColor: '#2563eb',
  })
  const supabase = createClient()

  const toneMap: Record<string, string> = {
    friendly: 'Bicara dengan hangat dan ramah seperti teman yang membantu.',
    formal: 'Bicara dengan sopan dan profesional.',
    casual: 'Bicara santai dan akrab.',
  }

  async function save() {
    if (!data.name || !data.vertical) return
    setSaving(true)

    const org = data.orgName ? ` dari ${data.orgName}` : ''
    const region = data.region ? ` yang beroperasi di ${data.region}` : ''
    const systemPrompt = `Kamu adalah ${data.name}${org}${region}. ${toneMap[data.tone] || toneMap.friendly} Jangan pernah menyebut bahwa kamu adalah Claude atau AI buatan Anthropic.`

    const welcomeMap: Record<string, string> = {
      dprd: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'wakil rakyat Anda'}. Ada yang bisa saya bantu?`,
      klinik: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'layanan kesehatan kami'}. Ada yang bisa saya bantu?`,
      masjid: `Assalamualaikum! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'masjid kami'}. Ada yang bisa saya bantu?`,
      umkm: `Halo! Saya ${data.name} 👋 Ada yang bisa saya bantu seputar produk dan layanan kami?`,
      sekolah: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'sekolah kami'}. Silakan tanya apa saja!`,
      desa: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'pemerintah desa/kelurahan kami'}. Ada yang bisa saya bantu?`,
      custom: `Halo! Saya ${data.name} 👋 Ada yang bisa saya bantu?`,
    }

    const { error } = await supabase.from('personas').insert({
      tenant_id: tenantId,
      name: data.name,
      tagline: data.orgName ? `Asisten Digital ${data.orgName}` : 'Asisten AI',
      primary_color: data.primaryColor,
      system_prompt: systemPrompt,
      welcome_message: welcomeMap[data.vertical] || welcomeMap.custom,
      tone: data.tone,
      is_active: true,
    })

    setSaving(false)
    if (error) { alert('Gagal: ' + error.message); return }
    onCreated()
  }

  const colors = ['#2563eb', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#2563eb' : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Jenis layanan apa ini?</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Pilih yang paling sesuai</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {VERTICALS.map(v => (
              <button key={v.id} onClick={() => { setData(d => ({ ...d, vertical: v.id })); setStep(2) }}
                style={{ padding: '16px', borderRadius: 12, border: `2px solid ${data.vertical === v.id ? '#2563eb' : '#e2e8f0'}`, background: data.vertical === v.id ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{v.label}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{v.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Info dasar asisten AI</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Isi sesuai identitas organisasimu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nama Asisten AI *</label>
              <input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                placeholder='e.g. "Sari", "Pak Budi", "Maya"'
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nama Organisasi / Lembaga</label>
              <input value={data.orgName} onChange={e => setData(d => ({ ...d, orgName: e.target.value }))}
                placeholder='e.g. "DPRD Kota Semarang", "Klinik Sehat Mandiri"'
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Wilayah / Daerah Jangkauan</label>
              <input value={data.region} onChange={e => setData(d => ({ ...d, region: e.target.value }))}
                placeholder='e.g. "Kecamatan Tembalang, Semarang"'
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>Warna Brand</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {colors.map(c => (
                  <button key={c} onClick={() => setData(d => ({ ...d, primaryColor: c }))}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: data.primaryColor === c ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 14 }}>← Kembali</button>
            <button onClick={() => setStep(3)} disabled={!data.name}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: data.name ? '#1d4ed8' : '#e2e8f0', color: data.name ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 14, cursor: data.name ? 'pointer' : 'not-allowed' }}>
              Lanjut →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Bagaimana cara bicaranya?</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Pilih tone yang sesuai karakter organisasimu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {TONES.map(t => (
              <button key={t.id} onClick={() => setData(d => ({ ...d, tone: t.id }))}
                style={{ padding: '16px', borderRadius: 12, border: `2px solid ${data.tone === t.id ? '#2563eb' : '#e2e8f0'}`, background: data.tone === t.id ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ padding: '16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: data.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{data.name[0] || '?'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{data.name || 'Nama Asisten'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{data.orgName || 'Nama Organisasi'} · {TONES.find(t => t.id === data.tone)?.label}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 14 }}>← Kembali</button>
            <button onClick={save} disabled={saving}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Menyimpan...' : '🚀 Buat Persona'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
