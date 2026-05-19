'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function handleAuth() {
    if (!email || !password) return
    setLoading(true); setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else location.href = '/dashboard'
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Cek email kamu untuk verifikasi!')
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    location.href = '/login'
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eff6ff 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: 400, boxShadow: '0 8px 40px rgba(59,130,246,0.12)', border: '1px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>SapaCerdas</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>AI Persona White-label Platform</p>
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', fontWeight: mode === m ? 600 : 400, fontSize: 14, color: mode === m ? '#1e293b' : '#64748b', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              {m === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Password" style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          {message && <div style={{ padding: '10px 12px', borderRadius: 8, background: message.includes('Cek') ? '#f0fdf4' : '#fef2f2', color: message.includes('Cek') ? '#16a34a' : '#dc2626', fontSize: 13 }}>{message}</div>}
          <button onClick={handleAuth} disabled={!email || !password || loading} style={{ padding: '13px', borderRadius: 10, border: 'none', background: email && password ? '#1d4ed8' : '#e2e8f0', color: email && password ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 15, cursor: email && password ? 'pointer' : 'not-allowed', marginTop: 4, transition: 'all 0.2s' }}>
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun'}
          </button>
        </div>
        {mode === 'login' && (
          <button onClick={handleLogout} style={{ marginTop: 16, width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
            Keluar dari akun saat ini
          </button>
        )}
      </div>
    </div>
  )
}
