'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import PersonaWizard from '@/components/PersonaWizard'

function NewPersonaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantId = searchParams.get('tenant') || ''

  if (!tenantId) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#64748b' }}>Tenant tidak ditemukan. <a href="/dashboard" style={{ color: '#2563eb' }}>Kembali ke dashboard</a></p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          ← Kembali
        </button>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Buat Persona Baru</span>
      </div>

      {/* Wizard */}
      <PersonaWizard
        tenantId={tenantId}
        onCreated={() => router.push('/dashboard')}
      />
    </div>
  )
}

export default function NewPersonaPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NewPersonaContent />
    </Suspense>
  )
}
