// API-route för admin-autentisering
// Jämför lösenordet mot miljövariabeln ADMIN_PASSWORD och sätter en signerad session-cookie

import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminToken } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  // Hämta admin-lösenordet från miljövariabler
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin-lösenord ej konfigurerat' }, { status: 500 })
  }

  if (password !== adminPassword) {
    // Returnera 401 vid fel lösenord
    return NextResponse.json({ error: 'Fel lösenord' }, { status: 401 })
  }

  // Cookien krävs av /api/admin/bars som skriver med service role
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, createAdminToken(adminPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: ADMIN_SESSION_SECONDS,
  })
  return res
}
