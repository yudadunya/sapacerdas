import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SapaCerdas — Platform AI White-Label untuk Database Audiens',
  description: 'Buat AI asisten berbranding kamu sendiri. Deploy dalam 1 hari, kumpulkan database audiens secara otomatis.'
}

const INDUSTRIES = [
  { icon: '🏛️', name: 'Politik', desc: 'Layani konstituen, bangun database pemilih' },
  { icon: '🏥', name: 'Kesehatan', desc: 'Klinik & RS otomasi customer service' },
  { icon: '🎓', name: 'Pendidikan', desc: 'Sekolah & bimbel akuisisi siswa baru' },
  { icon: '🛍️', name: 'UMKM', desc: 'Toko & brand bangun database pelanggan' },
  { icon: '🕌', name: 'Keagamaan', desc: 'Masjid & pesantren kelola jamaah digital' },
  { icon: '🏠', name: 'Properti', desc: 'Agen & developer capture hot leads' },
]

const FEATURES = [
  { icon: '🤖', title: 'Persona AI Custom', desc: 'Nama, karakter, dan gaya bicara sesuai brand kamu. Tidak terasa seperti bot.' },
  { icon: '🗄️', title: 'Database Otomatis', desc: 'Setiap percakapan mengumpulkan nama, nomor, lokasi, dan topik secara natural.' },
  { icon: '🔄', title: 'Data Selalu Uptodate', desc: 'Sync dengan Google Sheet klien. AI selalu jawab dengan info terbaru.' },
  { icon: '⚡', title: 'Deploy 1 Hari', desc: 'Upload dokumen, atur persona, pilih warna — portal langsung aktif.' },
  { icon: '💰', title: 'Biaya Sangat Murah', desc: 'Cache cerdas hemat 60% biaya AI. Mulai dari Rp 1,5 jt/bulan.' },
  { icon: '📊', title: 'Analytics Real-time', desc: 'Dashboard lengkap: jumlah leads, topik populer, biaya AI, export CSV.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur border-b border-gray-100 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Sapa<span className="text-blue-600">Cerdas</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/portal/demo" className="text-sm text-gray-600 hover:text-gray-900">
              Lihat Demo
            </Link>
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition"
            >
              Dashboard Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            AI White-Label Platform · Deploy dalam 1 Hari
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Buat AI Asisten Berbranding
            <span className="text-blue-600"> Kamu Sendiri</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Platform white-label yang mengubah setiap percakapan menjadi database audiens terstruktur.
            Untuk politisi, klinik, UMKM, sekolah, masjid, dan siapapun yang punya audiens.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/portal/demo"
              target="_blank"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold transition"
            >
              Coba Demo Sekarang →
            </Link>
            <Link
              href="/admin"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold transition"
            >
              Buat Portal Baru
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10" style={{ fontFamily: 'Sora, sans-serif' }}>
            Cara Kerjanya
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Setup Portal', desc: 'Isi nama, upload foto, atur warna & persona AI', icon: '⚙️' },
              { step: '2', title: 'Upload Dokumen', desc: 'AI langsung belajar dari dokumen program kamu', icon: '📄' },
              { step: '3', title: 'Sebarkan Link', desc: 'Via Meta Ads, QR code baliho, atau link bio', icon: '📢' },
              { step: '4', title: 'Database Bertumbuh', desc: 'Setiap chat = kontak baru di dashboard kamu', icon: '📈' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-xs font-bold text-blue-600 mb-1">LANGKAH {s.step}</div>
                <div className="font-semibold text-gray-800 mb-2">{s.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10" style={{ fontFamily: 'Sora, sans-serif' }}>
            Untuk Semua Industri
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {INDUSTRIES.map((ind, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition cursor-default">
                <div className="text-2xl mb-2">{ind.icon}</div>
                <div className="font-semibold text-gray-800 text-sm">{ind.name}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{ind.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10" style={{ fontFamily: 'Sora, sans-serif' }}>
            Semua yang Kamu Butuhkan
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold text-gray-800 mb-1.5">{f.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Mulai Bangun Database Audiens Hari Ini
          </h2>
          <p className="text-blue-100 mb-8">
            Setup dalam 1 hari. Tanpa coding. Tanpa tim teknis.
          </p>
          <Link
            href="/admin"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-2xl font-bold hover:bg-blue-50 transition"
          >
            Buka Dashboard →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>© 2025 SapaCerdas. Platform AI White-Label Indonesia.</p>
      </footer>

    </div>
  )
}
