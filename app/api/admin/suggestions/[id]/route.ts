// Admin-API: godkänn eller avvisa ett prisförslag (C2)
// Godkänt förslag skrivs till bars av review_price_suggestion i databasen

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminAuth'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 })
  }

  const { approve } = await req.json()
  if (typeof approve !== 'boolean') {
    return NextResponse.json({ error: 'approve måste vara true eller false' }, { status: 400 })
  }

  const { data, error } = await createAdminClient().rpc('review_price_suggestion', {
    suggestion_id: params.id,
    approve,
  })
  if (error) {
    console.error('Granskning av prisförslag misslyckades:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(data)
}
