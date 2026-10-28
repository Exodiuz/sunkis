// Admin-API för att uppdatera och ta bort barer
// Anon-nyckeln får inte längre skriva till bars (D5) — här används service role
// efter att admin-cookien har kontrollerats.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminAuth'

type Params = { params: { id: string } }

// Fält som admin får ändra
const EDITABLE_FIELDS = [
  'price_40cl',
  'price_50cl',
  'happy_hour_price',
  'happy_hour_start',
  'happy_hour_end',
  'happy_hour_days',
  'sunk_factor',
  'price_verified',
  'price_thumbs_up',
  'price_thumbs_down',
  'updated_at',
] as const

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }
  // Verifiering räknas som bekräftelse av priset (D3)
  if (update.price_verified === true) update.price_confirmed_at = new Date().toISOString()

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Inget att uppdatera' }, { status: 400 })
  }

  const { error } = await createAdminClient().from('bars').update(update).eq('id', params.id)
  if (error) {
    console.error('Admin-uppdatering misslyckades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 })
  }

  const { error } = await createAdminClient().from('bars').delete().eq('id', params.id)
  if (error) {
    console.error('Admin-borttagning misslyckades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
