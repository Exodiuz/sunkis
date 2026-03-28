// API-route för admin-autentisering
// Jämför lösenordet mot miljövariabeln ADMIN_PASSWORD

import { NextRequest, NextResponse } from 'next/server'

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

  return NextResponse.json({ ok: true })
}
