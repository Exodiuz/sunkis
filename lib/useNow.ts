// useNow — aktuell tid som uppdateras varje minut
// Första renderingen använder serverns tidsstämpel så att HTML från servern
// och klienten matchar; direkt efter montering byts den mot riktig tid.

'use client'

import { useEffect, useState } from 'react'

export function useNow(renderedAt: number, intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date(renderedAt))

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
