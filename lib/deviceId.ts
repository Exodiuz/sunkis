// Anonymt enhets-id — en slumpad uuid i localStorage som skickas med varje röst
// Används för att begränsa röstning per enhet, inte för att identifiera personer

const STORAGE_KEY = 'sunkis:device-id'

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // Privat läge eller blockerad lagring — rösten går ändå igenom med ett engångs-id
    return crypto.randomUUID()
  }
}
