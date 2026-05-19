import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-secret') === process.env.ADMIN_SECRET
}

// Chunk text into smaller pieces
function chunkText(text: string, chunkSize = 800): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenantId, title, content, source } = await req.json()
  const supabase = createServiceClient()

  const chunks = chunkText(content)
  const rows = chunks.map((chunk, i) => ({
    tenant_id: tenantId,
    title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
    content: chunk,
    source,
    chunk_index: i
  }))

  const { data, error } = await supabase
    .from('knowledge_chunks')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ chunks: data, count: rows.length })
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('tenant_id', tenantId!)
    .order('created_at', { ascending: false })

  return NextResponse.json({ chunks: data })
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const supabase = createServiceClient()

  await supabase.from('knowledge_chunks').delete().eq('id', id)
  return NextResponse.json({ success: true })
}

// Google Sheets sync
export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenantId, sheetUrl } = await req.json()

  // Convert Google Sheet URL to CSV export URL
  const csvUrl = sheetUrl
    .replace('/edit#gid=', '/export?format=csv&gid=')
    .replace('/edit', '/export?format=csv')

  try {
    const res = await fetch(csvUrl)
    const csv = await res.text()

    // Parse CSV to text
    const lines = csv.split('\n').filter(l => l.trim())
    const content = lines.map(line => line.split(',').join(' | ')).join('\n')

    const supabase = createServiceClient()

    // Hapus chunk lama dari google sheets
    await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('source', 'google-sheets')

    // Insert baru
    const chunks = chunkText(content)
    const rows = chunks.map((chunk, i) => ({
      tenant_id: tenantId,
      title: `Data Live (${i + 1}/${chunks.length})`,
      content: chunk,
      source: 'google-sheets',
      chunk_index: i
    }))

    await supabase.from('knowledge_chunks').insert(rows)
    return NextResponse.json({ success: true, chunks: rows.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync sheet' }, { status: 500 })
  }
}
