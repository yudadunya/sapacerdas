'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

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

const CAPABILITIES = [
  { id: 'news', icon: '📰', label: 'Update berita lokal', desc: 'AI otomatis update isu & info terbaru wilayah' },
  { id: 'admin', icon: '📋', label: 'Bantu administrasi', desc: 'Draft surat, prosedur, pengaduan' },
  { id: 'faq', icon: '💬', label: 'Tanya jawab cerdas', desc: 'Jawab pertanyaan dari dokumen & knowledge base' },
  { id: 'schedule', icon: '📅', label: 'Info jadwal & kegiatan', desc: 'Sync dari Google Sheet otomatis' },
  { id: 'health', icon: '🏥', label: 'Edukasi kesehatan', desc: 'Info BPJS, gizi, pencegahan penyakit' },
  { id: 'law', icon: '⚖️', label: 'Info hukum & regulasi', desc: 'UU, peraturan daerah, hak warga' },
]

function generateSystemPrompt(data: {
  name: string
  vertical: string
  orgName: string
  region: string
  tone: string
  capabilities: string[]
}): string {
  const verticalContext: Record<string, string> = {
    dprd: `Kamu adalah asisten AI resmi dari ${data.orgName || 'anggota DPRD'} yang melayani konstituen di ${data.region || 'daerah pemilihan'}. Kamu membantu warga mendapatkan informasi tentang program kerja, aspirasi, kegiatan reses, peraturan daerah, dan isu-isu yang diperjuangkan wakil rakyat mereka.`,
    klinik: `Kamu adalah asisten AI dari ${data.orgName || 'fasilitas kesehatan'} di ${data.region || 'daerah ini'}. Kamu membantu pasien dan keluarga mendapatkan informasi layanan kesehatan, jadwal praktek dokter, prosedur pendaftaran, dan edukasi kesehatan.`,
    masjid: `Kamu adalah asisten AI dari ${data.orgName || 'masjid/pesantren'} di ${data.region || 'daerah ini'}. Kamu membantu jamaah mendapatkan informasi jadwal sholat, kegiatan kajian, program pesantren, dan menjawab pertanyaan seputar agama Islam.`,
    umkm: `Kamu adalah asisten AI dari ${data.orgName || 'usaha ini'} yang melayani pelanggan di ${data.region || 'daerah ini'}. Kamu membantu pelanggan mengetahui produk, harga, cara pemesanan, dan menjawab pertanyaan seputar layanan bisnis.`,
    sekolah: `Kamu adalah asisten AI dari ${data.orgName || 'institusi pendidikan'} di ${data.region || 'daerah ini'}. Kamu membantu calon siswa, orang tua, dan komunitas mendapatkan informasi penerimaan siswa baru, kurikulum, jadwal kegiatan, dan prestasi.`,
    desa: `Kamu adalah asisten AI dari ${data.orgName || 'pemerintah desa/kelurahan'} di ${data.region || 'wilayah ini'}. Kamu membantu warga mendapatkan informasi layanan administrasi, prosedur pengurusan dokumen, info bantuan sosial, dan menyampaikan aspirasi atau pengaduan.`,
    custom: `Kamu adalah asisten AI bernama ${data.name} dari ${data.orgName || 'organisasi ini'} yang beroperasi di ${data.region || 'wilayah ini'}.`,
  }

  const toneInstruction: Record<string, string> = {
    friendly: 'Gunakan bahasa Indonesia yang ramah, hangat, dan mudah dipahami semua kalangan. Sesekali gunakan sapaan yang akrab. Jadilah seperti "orang dalam" yang benar-benar peduli dengan kebutuhan pengguna.',
    formal: 'Gunakan bahasa Indonesia yang formal, sopan, dan profesional. Pertahankan wibawa dan kredibilitas dalam setiap jawaban.',
    casual: 'Gunakan bahasa yang santai dan akrab. Boleh sedikit gaul tapi tetap sopan dan informatif. Buat percakapan terasa ringan dan menyenangkan.',
  }

  const capabilityInstructions: Record<string, string> = {
    news: 'Kamu selalu update dengan isu dan berita terbaru di wilayah ini. Jika ada informasi terkini yang relevan dengan pertanyaan pengguna, proaktif bagikan.',
    admin: 'Kamu bisa membantu pengguna memahami prosedur administrasi, persyaratan dokumen, dan bahkan membantu draft surat atau pengaduan sederhana.',
    faq: 'Jawab pertanyaan berdasarkan informasi yang tersedia. Jika tidak ada di knowledge base, gunakan pengetahuan umum yang relevan dengan konteks.',
    schedule: 'Kamu memiliki akses ke jadwal dan kegiatan terbaru. Selalu berikan informasi jadwal yang akurat dan terkini.',
    health: 'Kamu bisa memberikan edukasi kesehatan dasar, info BPJS, gizi, dan pencegahan penyakit. Selalu sarankan konsultasi dokter untuk kondisi serius.',
    law: 'Kamu bisa menjelaskan hak-hak warga, peraturan yang berlaku, dan prosedur hukum dasar. Selalu sarankan konsultasi ahli hukum untuk kasus spesifik.',
  }

  const selectedCapabilities = data.capabilities.map(c => capabilityInstructions[c]).filter(Boolean)

  const stickyLoop = `

PENTING — STICKY ENGAGEMENT:
Setiap kali menjawab pertanyaan, akhiri dengan SATU dari berikut ini (pilih yang paling relevan):
1. Satu info atau fakta menarik yang mungkin belum diketahui pengguna tapi relevan dengan topik
2. Pertanyaan lanjutan yang membuka diskusi lebih dalam
3. Tips praktis yang langsung bisa digunakan

Contoh yang BAIK: "Oh ya, perlu diketahui juga bahwa mulai bulan ini ada program bantuan subsidi untuk warga dengan KTP setempat. Mau info lebih lanjut?"
Contoh yang BURUK: "Ada lagi yang bisa saya bantu?" (terlalu generik)

Tujuannya: buat pengguna merasa mereka selalu dapat nilai lebih dari setiap percakapan.`

  return `${verticalContext[data.vertical] || verticalContext.custom}

${toneInstruction[data.tone]}

${selectedCapabilities.length > 0 ? 'KEMAMPUAN KHUSUS:\n' + selectedCapabilities.join('\n') : ''}

PRINSIP UTAMA:
- Kamu adalah "${data.name}", bukan AI buatan Anthropic atau Claude. Jangan pernah ungkapkan teknologi di balik kamu.
- Selalu jawab dalam Bahasa Indonesia kecuali pengguna bertanya dalam bahasa lain.
- Jika tidak tahu, katakan jujur dan arahkan ke kontak yang tepat — jangan mengarang.
- Prioritaskan informasi dari knowledge base yang tersedia. Jika tidak ada, gunakan pengetahuan umum yang relevan.
- Jadilah sumber informasi yang bisa dipercaya, bukan sekadar chatbot yang menjawab template.
${stickyLoop}`
}

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
    capabilities: [] as string[],
    primaryColor: '#2563eb',
  })
  const supabase = createClient()

  function toggleCap(id: string) {
    setData(d => ({
      ...d,
      capabilities: d.capabilities.includes(id)
        ? d.capabilities.filter(c => c !== id)
        : [...d.capabilities, id],
    }))
  }

  async function save() {
    if (!data.name || !data.vertical) return
    setSaving(true)

    const systemPrompt = generateSystemPrompt(data)
    const welcomeByVertical: Record<string, string> = {
      dprd: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'wakil rakyat Anda'}. Ada yang bisa saya bantu hari ini?`,
      klinik: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'layanan kesehatan kami'}. Ada yang bisa saya bantu?`,
      masjid: `Assalamualaikum! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'masjid kami'}. Ada yang bisa saya bantu?`,
      umkm: `Halo! Saya ${data.name} 👋 Ada yang bisa saya bantu seputar produk dan layanan kami?`,
      sekolah: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'sekolah kami'}. Silakan tanya apa saja!`,
      desa: `Halo! Saya ${data.name} 👋 Asisten digital ${data.orgName || 'pemerintah desa/kelurahan kami'}. Ada yang bisa saya bantu?`,
      custom: `Halo! Saya ${data.name} 👋 Ada yang bisa saya bantu?`,
    }

    await supabase.from('personas').insert({
      tenant_id: tenantId,
      name: data.name,
      tagline: data.orgName ? `Asisten Digital ${data.orgName}` : 'Asisten AI',
      primary_color: data.primaryColor,
      system_prompt: systemPrompt,
      welcome_message: welcomeByVertical[data.vertical] || welcomeByVertical.custom,
      tone: data.tone,
      is_active: true,
    })

    setSaving(false)
    onCreated()
  }

  const colors = ['#2563eb', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#2563eb' : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Jenis layanan apa ini?</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Pilih yang paling sesuai — AI akan otomatis dikonfigurasi</p>
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Siapa nama asisten AI-nya?</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Beri nama yang terasa personal dan mudah diingat</p>
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
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: data.primaryColor === c ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer', outline: 'none', transition: 'all 0.15s' }} />
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
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Pilih tone yang sesuai dengan karakter organisasimu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {TONES.map(t => (
              <button key={t.id} onClick={() => setData(d => ({ ...d, tone: t.id }))}
                style={{ padding: '16px', borderRadius: 12, border: `2px solid ${data.tone === t.id ? '#2563eb' : '#e2e8f0'}`, background: data.tone === t.id ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 28 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 14 }}>← Kembali</button>
            <button onClick={() => setStep(4)} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Lanjut →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>AI-nya bisa apa aja?</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Pilih kemampuan tambahan (bisa lebih dari satu)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
            {CAPABILITIES.map(c => {
              const active = data.capabilities.includes(c.id)
              return (
                <button key={c.id} onClick={() => toggleCap(c.id)}
                  style={{ padding: '14px', borderRadius: 12, border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`, background: active ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{c.desc}</div>
                  {active && <div style={{ marginTop: 6, fontSize: 11, color: '#2563eb', fontWeight: 600 }}>✓ Aktif</div>}
                </button>
              )
            })}
          </div>

          {/* Preview */}
          <div style={{ padding: '16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview Persona</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: data.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{data.name[0] || '?'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{data.name || 'Nama Asisten'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{data.orgName || 'Nama Organisasi'} · {TONES.find(t => t.id === data.tone)?.label}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 14 }}>← Kembali</button>
            <button onClick={save} disabled={saving}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Menyimpan...' : '🚀 Buat Persona Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
