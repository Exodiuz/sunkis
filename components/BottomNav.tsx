// BottomNav — fast navigering i tumzonen: Lista · Karta · Lägg till (L4)
// Filtren följer med mellan listan och kartan. Döljs i /admin.

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { List, Map as MapIcon, Plus } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Lista', icon: List, carriesFilters: true },
  { href: '/map', label: 'Karta', icon: MapIcon, carriesFilters: true },
  { href: '/submit', label: 'Lägg till', icon: Plus, carriesFilters: false },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  if (pathname.startsWith('/admin')) return null

  const onFilterPage = pathname === '/' || pathname === '/map'

  return (
    <>
      {/* Utrymme så att sidans innehåll inte hamnar under menyn */}
      <div aria-hidden="true" className="h-16 pb-[env(safe-area-inset-bottom)]" />
      <nav
        aria-label="Huvudmeny"
        className="fixed inset-x-0 bottom-0 z-30 bg-[#1a1a18]/95 backdrop-blur-sm border-t border-[#2c2c2a] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="max-w-2xl mx-auto grid grid-cols-3 h-16">
          {ITEMS.map(({ href, label, icon: Icon, carriesFilters }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={e => {
                    // Ta med filtren (?oppet=1…) mellan lista och karta
                    if (carriesFilters && onFilterPage && window.location.search) {
                      e.preventDefault()
                      router.push(`${href}${window.location.search}`)
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 h-full text-sm transition-colors ${
                    active ? 'text-[#EF9F27]' : 'text-[#A3A199] hover:text-[#F1EFE8]'
                  }`}
                >
                  <Icon aria-hidden="true" className="w-5 h-5" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
