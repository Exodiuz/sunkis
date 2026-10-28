// Admin-API: väntande prisförslag med barens nuvarande pris (C2)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 })
  }

  const { data, error } = await createAdminClient()
    .from('price_suggestions')
    .select('id, price, size, created_at, bar:bars(id, name, area, price_40cl, price_50cl)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Kunde inte hämta prisförslag:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ suggestions: data ?? [] })
}
