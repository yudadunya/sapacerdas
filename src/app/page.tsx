'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Animated particle grid
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cols = Math.floor(canvas.width / 48)
      const rows = Math.floor(canvas.height / 48)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * 48 + 24
          const y = j * 48 + 24
          const wave = Math.sin(i * 0.4 + t) * Math.cos(j * 0.4 + t * 0.7)
          const alpha = (wave + 1) / 2 * 0.18
          ctx.beginPath()
          ctx.arc(x, y, 1.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 255, 180, ${alpha})`
          ctx.fill()
        }
      }
      t += 0.012
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  const features = [
    { icon: '⚡', title: 'Deploy dalam menit', desc: 'Dari nol ke AI persona live hanya butuh 10 menit. Tanpa coding, tanpa server.' },
    { icon: '🎭', title: 'Persona seutuhnya kamu', desc: 'Nama, warna, avatar, tone bicara — semua bisa dikustomisasi penuh sesuai brand.' },
    { icon: '🧠', title: 'Belajar dari dokumenmu', desc: 'Upload SOP, FAQ, atau Google Sheet. AI akan menjawab berdasarkan data kamu.' },
    { icon: '📊', title: 'Database kontak otomatis', desc: 'Setiap pengunjung yang chat otomatis dicatat nama, WhatsApp, dan lokasinya.' },
    { icon: '🔒', title: 'Data terisolasi per klien', desc: 'Setiap tenant punya database sendiri. Tidak ada data yang bocor antar klien.' },
    { icon: '💰', title: 'Hemat biaya AI hingga 60%', desc: 'Sistem cache otomatis menyimpan jawaban pertanyaan yang sering ditanyakan.' },
  ]

  const plans = [
    { name: 'Starter', price: '1,5 jt', per: '/bulan', color: '#00ffb4', features: ['1 persona', '3.000 pesan/bln', '5 dokumen', '500 kontak', 'Portal web'] },
    { name: 'Growth', price: '3,5 jt', per: '/bulan', color: '#00d4ff', features: ['3 persona', '15.000 pesan/bln', '20 dokumen', '3.000 kontak', 'Google Sheet sync', 'Custom domain', 'Analytics'], popular: true },
    { name: 'Pro', price: '7 jt', per: '/bulan', color: '#a78bfa', features: ['10 persona', 'Unlimited pesan', 'Unlimited dokumen', 'Unlimited kontak', 'Semua fitur Growth', 'White-label reseller'] },
  ]

  return (
    <div style={{ background: '#030810', color: '#e2e8f0', fontFamily: '"DM Sans", "Helvetica Neue", sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #00ffb433; color: #00ffb4; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse-ring { 0%,100% { transform:scale(1); opacity:0.4 } 50% { transform:scale(1.15); opacity:0.1 } }
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes scan { 0% { top:0 } 100% { top:100% } }
        .hero-title { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(42px,7vw,96px); line-height:1.0; letter-spacing:-2px; }
        .fade-in { animation: fadeUp 0.7s ease both; }
        .card-hover { transition: transform 0.2s, border-color 0.2s; }
        .card-hover:hover { transform: translateY(-4px); border-color: #00ffb444 !important; }
        .nav-link { color: #94a3b8; font-size:14px; text-decoration:none; transition:color 0.2s; }
        .nav-link:hover { color: #00ffb4; }
        .cta-btn { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; background:#00ffb4; color:#030810; font-weight:500; font-size:15px; border-radius:999px; text-decoration:none; border:none; cursor:pointer; transition:all 0.2s; }
        .cta-btn:hover { background:#00e8a2; transform:scale(1.03); }
        .cta-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; background:transparent; color:#e2e8f0; font-size:15px; border-radius:999px; text-decoration:none; border:1px solid #ffffff22; cursor:pointer; transition:all 0.2s; }
        .cta-btn-ghost:hover { border-color:#ffffff44; background:#ffffff08; }
        .glow { text-shadow: 0 0 40px #00ffb466; }
      `}</style>

      {/* Canvas bg */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Noise overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(3,8,16,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid #ffffff0f' : 'none', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #00ffb4, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>SapaCerdas</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="#features" className="nav-link">Fitur</a>
          <a href="#pricing" className="nav-link">Harga</a>
          <a href="/login" className="nav-link">Masuk</a>
          <a href="/login" className="cta-btn" style={{ padding: '8px 20px', fontSize: 14 }}>Mulai Gratis →</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 5vw 80px' }}>
        <div className="fade-in" style={{ animationDelay: '0.1s', marginBottom: 24 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, border: '1px solid #00ffb433', background: '#00ffb408', fontSize: 13, color: '#00ffb4', fontWeight: 500 }}>
            ✦ Platform AI Persona White-label #1 di Indonesia
          </span>
        </div>
        <h1 className="hero-title fade-in glow" style={{ animationDelay: '0.2s', maxWidth: 900 }}>
          Klienmu Butuh AI.<br />
          <span style={{ color: '#00ffb4' }}>Kamu Yang Jual.</span>
        </h1>
        <p className="fade-in" style={{ animationDelay: '0.35s', marginTop: 28, fontSize: 20, color: '#94a3b8', maxWidth: 560, lineHeight: 1.6, fontWeight: 300 }}>
          Bangun AI asisten berbranding sendiri untuk klinik, DPRD, masjid, UMKM — dalam 10 menit. Tanpa coding.
        </p>
        <div className="fade-in" style={{ animationDelay: '0.5s', marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/login" className="cta-btn">Coba Gratis Sekarang →</a>
          <a href="/demo" className="cta-btn-ghost">Lihat Demo</a>
        </div>
        <div className="fade-in" style={{ animationDelay: '0.65s', marginTop: 64, display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['10 menit', 'setup pertama'], ['60%', 'hemat biaya AI'], ['∞', 'klien & persona']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: '#00ffb4' }}>{num}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '100px 5vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, color: '#00ffb4', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Kenapa SapaCerdas</p>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>Semua yang kamu butuhkan<br /><span style={{ color: '#00ffb4' }}>sudah ada di dalamnya</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {features.map((f, i) => (
            <div key={f.title} className="card-hover" style={{ padding: '28px', borderRadius: 16, border: '1px solid #ffffff0f', background: '#0a1628', animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '100px 5vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, color: '#00ffb4', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Harga</p>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, letterSpacing: '-1px' }}>Mulai kecil, <span style={{ color: '#00ffb4' }}>scale besar</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {plans.map(plan => (
            <div key={plan.name} className="card-hover" style={{ padding: '32px', borderRadius: 20, border: plan.popular ? `1.5px solid ${plan.color}44` : '1px solid #ffffff0f', background: plan.popular ? '#0a1628' : '#060d1a', position: 'relative', overflow: 'hidden' }}>
              {plan.popular && <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#00d4ff22', color: '#00d4ff', fontWeight: 500 }}>Terpopuler</div>}
              <div style={{ fontSize: 13, color: plan.color, fontWeight: 500, marginBottom: 12 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontFamily: 'Syne', fontSize: 40, fontWeight: 800, color: '#f1f5f9' }}>Rp {plan.price}</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>{plan.per}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#94a3b8' }}>
                    <span style={{ color: plan.color, fontSize: 16 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, background: plan.popular ? plan.color : 'transparent', border: plan.popular ? 'none' : `1px solid ${plan.color}44`, color: plan.popular ? '#030810' : plan.color, fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}>
                Mulai Sekarang →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 5vw', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(32px,4vw,56px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 24 }}>
            Siap deploy AI<br /><span style={{ color: '#00ffb4' }}>persona pertamamu?</span>
          </h2>
          <p style={{ fontSize: 17, color: '#64748b', marginBottom: 40, lineHeight: 1.6 }}>Bergabung dengan ratusan bisnis yang sudah menggunakan SapaCerdas untuk melayani pelanggan mereka 24/7.</p>
          <a href="/login" className="cta-btn" style={{ fontSize: 16, padding: '16px 36px' }}>Mulai Gratis — Tanpa Kartu Kredit →</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '40px 5vw', borderTop: '1px solid #ffffff08', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #00ffb4, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15 }}>SapaCerdas</span>
        </div>
        <div style={{ fontSize: 13, color: '#334155' }}>© 2026 SapaCerdas. All rights reserved.</div>
      </footer>
    </div>
  )
}
