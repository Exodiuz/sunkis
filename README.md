<div align="center">

# 🍺 sunkis

**Billigaste ölet i Stockholm**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-gratis-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-deploy-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/licens-MIT-blue?style=flat-square)](LICENSE)

*En mörk, ruffig guide till Stockholms billigaste bardricka*

</div>

---

## Vad är Sunkis?

Sunkis hjälper dig hitta det billigaste ölet på bar i Stockholm. Community-driven med rankinglista, interaktiv karta och realtids-happy hour.

### Funktioner

| Feature | Beskrivning |
|---------|-------------|
| 🏆 **Rankinglista** | Barer sorterade billigast → dyrast med rank, pris och sunkfaktor |
| 🗺️ **Karta** | Leaflet.js med färgkodade pins — grön/gul/röd beroende på pris |
| ⚡ **Happy hour** | Visar rätt pris baserat på aktuell tid i Stockholm |
| 👍 **Prisröstning** | Community verifierar om priset stämmer |
| ⭐ **Sunkfaktor** | 1–5 cirklar — hur sunkigt är det egentligen? |
| ➕ **Lägg till bar** | Vem som helst kan föreslå nya barer |
| 🔐 **Admin-panel** | Lösenordsskyddad panel för att hantera och verifiera priser |
| 📱 **PWA** | Installeras på hemskärmen, mobiloptimerad |

---

## Skärmdumpar

<table>
  <tr>
    <td align="center"><b>Rankinglista</b></td>
    <td align="center"><b>Karta</b></td>
    <td align="center"><b>Detaljsida</b></td>
  </tr>
  <tr>
    <td>
<pre>
┌─────────────────────────┐
│  sunkis                 │
│  Billigaste ölet i Sthlm│
│─────────────────────────│
│ [Alla][Öppet nu][HH nu] │
│ [Söder][Kungsholmen]... │
│─────────────────────────│
│ #1  Nivå 22             │
│     Kungsholmen • Öppet │
│              25 kr/40cl │
│     ●●●●○  👍 12  👎 1  │
│─────────────────────────│
│ #2  The International.. │
│     Södermalm  • Öppet  │
│  ⚡ HH nu!  25 kr/40cl  │
│     ●●●●●  👍 28  👎 0  │
└─────────────────────────┘
</pre>
    </td>
    <td>
<pre>
┌─────────────────────────┐
│  [Karta]                │
│  ┌───────────────────┐  │
│  │  Stockholm        │  │
│  │    🟢 25kr        │  │
│  │  🟢 29kr          │  │
│  │       🟡 45kr     │  │
│  │   🔴 75kr         │  │
│  └───────────────────┘  │
│  🟢 <35kr 🟡 35-55 🔴 55+│
└─────────────────────────┘
</pre>
    </td>
    <td>
<pre>
┌─────────────────────────┐
│ ← Tillbaka   sunkis     │
│─────────────────────────│
│ [Foto]                  │
│─────────────────────────│
│ The International Bar   │
│ Södermalm               │
│ ⚡ Happy hour just nu!  │
│─────────────────────────│
│ PRISER                  │
│ 29 kr    HH: 25 kr      │
│ /40cl    11:00–18:00    │
│─────────────────────────│
│ SUNKFAKTOR              │
│ ●●●●●  5.0  (112 röster)│
│─────────────────────────│
│ Stämmer priset?         │
│ [👍 Ja, 28] [👎 Nej, 0] │
└─────────────────────────┘
</pre>
    </td>
  </tr>
</table>

---

## Tech stack

```
Frontend:   Next.js 14 (App Router) + TypeScript
Styling:    Tailwind CSS + CSS-variabler
Karta:      Leaflet.js (open source)
Databas:    Supabase (PostgreSQL, gratis tier)
Hosting:    Vercel (gratis)
Font:       Inter via Google Fonts
Data:       Google Places API (Nearby Search + Place Details)
```

---

## Kom igång

### 1. Klona och installera

```bash
git clone https://github.com/Exodiuz/sunkis.git
cd sunkis
npm install
```

### 2. Miljövariabler

```bash
cp .env.example .env.local
```

Öppna `.env.local` och fyll i:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_PLACES_API_KEY=AIzaSy...
ADMIN_PASSWORD=välj-ett-lösenord
```

### 3. Sätt upp Supabase

1. Skapa gratis projekt på [supabase.com](https://supabase.com)
2. Gå till **SQL Editor** och kör hela [`supabase/schema.sql`](supabase/schema.sql)
3. Kopiera nycklarna från **Settings → API** till `.env.local`

### 4. Ladda in testdata

```bash
# Snabb testdata (12 barer, ingen Google API krävs)
node scripts/seed-manual.js

# Eller hämta riktiga barer från Google Places (~180 barer)
node scripts/seed-bars.js
```

### 5. Starta lokalt

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) 🍺

---

## Lägg till priser

Barer hämtas utan pris från Google Places. Fyll i via admin-panelen:

1. Gå till `/admin` — logga in med ditt `ADMIN_PASSWORD`
2. Klicka **"Barer utan pris"**
3. Fyll i pris, happy hour-tider och sunkfaktor
4. **Spara & verifiera** → baren dyker upp i rankinglistan

---

## Databasschema

```sql
bars
├── id                UUID (PK)
├── google_place_id   TEXT UNIQUE
├── name              TEXT
├── address / area    TEXT
├── lat / lng         FLOAT
├── opening_hours     JSONB   -- { "monday": "15:00–01:00", ... }
├── price_40cl        INT     -- pris i kronor
├── price_50cl        INT
├── happy_hour_price  INT
├── happy_hour_start  TIME    -- "15:00"
├── happy_hour_end    TIME    -- "18:00"
├── happy_hour_days   TEXT[]  -- ["monday","friday"]
├── sunk_factor       FLOAT   -- snitt 1–5
├── sunk_votes        INT
├── price_verified    BOOLEAN
├── price_thumbs_up   INT
└── price_thumbs_down INT

sunk_votes  -- community-röstning på sunkfaktor
price_votes -- community-verifiering av priser
```

---

## Projektstruktur

```
sunkis/
├── app/
│   ├── page.tsx              ← startsida (SSR)
│   ├── HomeClient.tsx        ← filter + sökning (klient)
│   ├── map/page.tsx          ← Leaflet-karta
│   ├── bar/[id]/page.tsx     ← detaljsida
│   ├── submit/page.tsx       ← lägg till bar
│   ├── admin/page.tsx        ← admin-panel
│   └── api/admin/auth/       ← login-endpoint
├── components/
│   ├── BarCard.tsx           ← kort i rankinglistan
│   ├── BarMap.tsx            ← Leaflet-kartan
│   ├── FilterPills.tsx       ← filterknappar
│   ├── PriceVote.tsx         ← 👍/👎
│   ├── SunkFactor.tsx        ← 1–5 cirklar
│   └── HappyHourBadge.tsx    ← "Happy hour just nu!"
├── lib/
│   ├── supabase.ts           ← klient + typdefinitioner
│   └── happyHour.ts          ← happy hour-logik (Europe/Stockholm)
├── scripts/
│   ├── seed-bars.js          ← Google Places-inhämtning
│   └── seed-manual.js        ← testdata (12 barer)
└── supabase/
    └── schema.sql            ← hela databasschemat
```

---

## Deploy på Vercel

```bash
# 1. Pusha till GitHub (redan gjort om du läser detta)

# 2. Importera på vercel.com → New Project → välj sunkis

# 3. Lägg till miljövariabler under Settings → Environment Variables

# 4. Deploy!
```

### Koppla sunkis.se

Lägg till dessa DNS-poster hos din domänregistrator:

| Typ | Namn | Värde |
|-----|------|-------|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Vercel aktiverar HTTPS automatiskt via Let's Encrypt.

---

## Bidra

Pull requests välkomnas! Öppna ett issue för buggar eller feature-förslag.

1. Forka repot
2. Skapa en branch: `git checkout -b feature/din-feature`
3. Commita: `git commit -m 'Lägg till X'`
4. Pusha: `git push origin feature/din-feature`
5. Öppna en Pull Request

---

<div align="center">

*Sunkis — för dig som vill ha öl utan att tömma plånboken* 🍺

</div>
