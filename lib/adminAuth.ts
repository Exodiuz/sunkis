// Admin-session — signerad cookie som sätts vid inloggning
// Bara för server-side (route handlers). Token = utgångstid + HMAC med ADMIN_PASSWORD.

import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const ADMIN_COOKIE = 'sunkis_admin'
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function createAdminToken(secret: string, now = Date.now()): string {
  const expires = String(now + ADMIN_SESSION_SECONDS * 1000)
  return `${expires}.${sign(expires, secret)}`
}

export function isValidAdminToken(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || Number(expires) < now) return false
  const expected = Buffer.from(sign(expires, secret))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function isAdminRequest(req: NextRequest): boolean {
  return isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD)
}
