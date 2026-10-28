# Kartval för Sunkis

*Utredning inför K1–K4 och C1. Villkor och priser kontrollerade 2026-10-28. Länkarna står vid varje påstående.*

## Sammanfattning

**Rekommendation: MapLibre GL JS med OpenFreeMap som kartbild, Photon för adressökning (via vår egen proxy) och djuplänkar till Google Maps och Apple Maps för vägbeskrivning.**

Det ger mörk och ljus kartstil som vi kan styla själva, nålar med pris och klustring. Det kostar inget per visning och bryter inte mot OSM:s tile-policy. Som reserv om OpenFreeMap skulle sluta fungera hostar vi kartan själva (OpenFreeMap och Protomaps är båda öppen källkod). Google Maps-nyckeln behövs inte för något av detta.

Utgångspunkten i uppdraget stod sig. En nyans: OpenFreeMap och Protomaps använder olika vektorscheman (OpenMapTiles respektive Protomaps), så vi bör välja ett av dem från början i stället för att planera att "byta URL" senare.

## Jämförelse

Räknat på **50 000 kartvisningar per månad**, ungefär 30 vektortiles per visning (inzoomat på Stockholm, några panoreringar).

| | 1. Leaflet + OSM:s tile-server (i dag) | 2a. MapLibre + OpenFreeMap | 2b. MapLibre + Protomaps (egen hosting) | 3. MapLibre + MapTiler / Stadia | 4. Google Maps JS API |
|---|---|---|---|---|---|
| **Kostnad vid 50 k visningar** | 0 kr | 0 kr | ≈ 0 kr (en PMTiles-fil på R2/S3, se nedan) | MapTiler: Flex ($30) täcker 25 k sessioner, så det krävs en större plan. Stadia: Starter $20 + ≈ $15 överskott ≈ **$35/mån** | 10 k gratis, sedan 40 k × $7/1000 ≈ **$280/mån** |
| **Villkor** | Best effort, ingen SLA. Kommersiella tjänster ska räkna med att åtkomsten ”may be withdrawn at any point” ([policy](https://operations.osmfoundation.org/policies/tiles/)) | Gratis, ingen nyckel, inga gränser för visningar, kommersiell användning tillåten, ingen SLA ([openfreemap.org](https://openfreemap.org/)) | Vi äger driften. BSD/ODbL ([docs](https://docs.protomaps.com/)) | MapTiler Free: 5 000 sessioner, pausas när kvoten är slut, avsedd för icke-kommersiell användning ([pris](https://www.maptiler.com/cloud/pricing/)). Stadia Free: ”Commercial use not allowed” ([pris](https://stadiamaps.com/pricing)) | Betalkonto krävs ([pris](https://developers.google.com/maps/billing-and-pricing/pricing)) |
| **Mörk/ljus stil, egen styling** | Nej. Bara raster, mörkt tema kräver CSS-filter-hack | Ja: Positron, Bright, Liberty, **Dark**, Fiord. Stil-JSON kan forkas | Ja: flavors light/dark m.fl., egen stil-JSON | Ja, färdiga mörka stilar plus editor | Ja, via Map ID och molnstyling |
| **Prisnålar (K2), klustring, prestanda** | `divIcon` med HTML fungerar. Klustring kräver plugin. OK för några hundra barer | HTML-markörer (`maplibregl.Marker`) eller symbol-lager med text. Inbyggd GPU-klustring i GeoJSON-källan. Bäst på mellanklasstelefon | Samma som 2a | Samma som 2a | `AdvancedMarker` med React-innehåll, klustring via `@googlemaps/markerclusterer` |
| **Geokodning (C1)** | Separat, se nedan | Separat, se nedan | Separat | Ingår (Stadia: 20 krediter per geokodning, autocomplete v2: 1 kredit) | Places Autocomplete: 10 k gratis, sedan $2,83/1000 |
| **Bundle (gzip, ungefär)** | ~40 kB | ~220 kB (maplibre-gl), laddas bara på `/map` | ~220 kB + pmtiles ~10 kB | ~220 kB | Liten wrapper (`@vis.gl/react-google-maps`), men Googles skript laddas från CDN vid körning |
| **SSR i Next.js** | `dynamic(..., { ssr: false })` (som i dag) | Samma mönster | Samma | Samma | Samma, plus `APIProvider` |
| **Återanvändning av `BarMap.tsx`** | 100 % | Datafiltrering, färglogik, popupinnehåll, legend, dynamic import | Samma som 2a | Samma som 2a | Färglogik och legend. Popup och markörer skrivs om |
| **Attribution** | ”© OpenStreetMap” synligt nere till höger | MapLibre lägger till ”© OpenMapTiles Data from OpenStreetMap” automatiskt | ”© OpenStreetMap” + Protomaps | Leverantörens text, läggs till automatiskt | Googles logga och villkor, automatiskt |
| **API-nyckel** | Ingen | Ingen | Ingen | Ja, publik nyckel med domänbegränsning | Ja, publik nyckel med HTTP-referrer-begränsning plus budgetlarm |
| **När gratiskvoten tar slut** | Ingen kvot, men vi kan blockeras utan förvarning | Ingen kvot | Vi betalar för lagring och trafik (marginellt) | MapTiler Free och Stadia Free stoppar. Betalplaner debiterar överskott | Debiteras per 1 000 (tak går att sätta i Cloud Console) |

### Kostnadskalkyl för 2b (egen hosting)

En Stockholms-extrakt som PMTiles-fil blir några tiotal till ett par hundra MB. På Cloudflare R2 är lagringen några ören i månaden och utgående trafik gratis. 50 000 × 30 range-requests ≈ 1,5 miljoner läsoperationer, vilket ryms i R2:s gratisnivå. Kostnaden är i praktiken **0 kr**, men vi ansvarar själva för uppdatering och drift.

## Varför inte de andra

- **1. Behåll Leaflet + tile.openstreetmap.org.** Policyn kräver unik User-Agent och Referer, cache enligt headers och synlig attribution. Kommersiella tjänster ska räkna med att åtkomsten kan dras in. Det finns ingen riktig mörk stil, och K4 hade blivit en CSS-invert som gör kartan grå och lerig. Fungerar som nödlösning, inte för lansering.
- **3. MapTiler / Stadia.** Tekniskt likvärdigt med 2a, men gratisnivåerna är inte kommersiella. Vi skulle betala $30–35+ i månaden för något OpenFreeMap ger gratis, plus en API-nyckel att hantera. Värt att återkomma till om vi vill ha SLA och support.
- **4. Google Maps.** Bäst platsdata, men ≈ $280/mån vid 50 k visningar, och kostnaden växer linjärt med framgång. Kräver betalkonto och nyckelhantering. Enligt arbetsreglerna ska du tillfrågas innan betaltjänster läggs till, och jämförelsen ger inget skäl att göra det.

## Geokodning och adressökning (C1)

| Tjänst | Villkor | Passar för |
|---|---|---|
| **Nominatim** (publika servern) | Högst 1 anrop/s, **autocomplete är förbjudet**, resultat ska cachas, identifierande User-Agent eller Referer krävs, ODbL-attribution ([policy](https://operations.osmfoundation.org/policies/nominatim/)) | Sök på knapptryck ("Sök adress"), inte sök medan man skriver |
| **Photon** (photon.komoot.io) | ”please be fair – extensive usage will be throttled”. Typeahead är en uttalad funktion. Ingen SLA, kommersiell användning nämns inte ([photon.komoot.io](https://photon.komoot.io/)) | Sök medan man skriver i `/submit` |
| Leverantörens API (Stadia/MapTiler) | Ingår i betalplan | Om vi ändå väljer alternativ 3 |
| Google Places Autocomplete | 10 k gratis/mån, sedan $2,83/1000 | Bäst träffsäkerhet på barnamn, men kräver betalkonto |

**Förslag:** En egen route `/api/geocode` som anropar Photon (begränsat till Stockholms bbox, `lang=sv`). Den sätter en identifierande User-Agent, cachar svaren (till exempel 24 h), debouncar till minst 300 ms och anropas bara i `/submit`. Volymen är låg (inskick, inte sidvisningar). Vi sparar `lat`, `lng` och `osm_type` + `osm_id` (ny kolumn `osm_id`, eftersom `google_place_id` inte gäller). Är Photon nere faller routen tillbaka på Nominatim, och då bara som ett anrop per knapptryck.

## Vägbeskrivning (B3)

Oberoende av kartbibliotek och utan API-nyckel ([Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)):

- Google: `https://www.google.com/maps/dir/?api=1&destination={lat}%2C{lng}&travelmode=walking`
- Apple: `https://maps.apple.com/?daddr={lat},{lng}&dirflg=w`

Visa Apple-länken på iOS och Google-länken annars (eller båda).

## Migreringsplan för `BarMap.tsx`

1. **Beroenden:** `maplibre-gl` (CSS importeras i komponenten i stället för från unpkg). Valfritt: `@vis.gl/react-maplibre` om vi vill ha React-markörer. Annars rå MapLibre som i dag med Leaflet.
2. **`lib/mapStyle.ts`:** stil-URL per tema (`https://tiles.openfreemap.org/styles/dark` respektive `positron`), vald via `prefers-color-scheme` (K4). Senare en forkad stil-JSON i Sunkis-färger (V1).
3. **Kartinstans:** byt `L.map` + `L.tileLayer` mot `new maplibregl.Map({ container, style, center: [18.0686, 59.3293], zoom: 13 })`. Observera ordningen lng/lat.
4. **Data som GeoJSON:** bygg en `FeatureCollection` av barerna med `price`, `size`, `isHappyHour` och `color` som properties (återanvänd `getCurrentPrice`, `getComparablePrice` och `getPinColor`). Källan får `cluster: true, clusterRadius: 40`.
5. **Nålar (K2):** kluster som cirkel- och symbollager med antal. Enskilda barer som symbollager med text ”25 kr” och happy hour-ikon via `icon-image`, eller som HTML-markörer som synkas mot `querySourceFeatures`. Behåll 44 px träffyta och tillgängligt namn (A3).
6. **Popup:** `maplibregl.Popup` med samma innehåll som i dag. Behåll `escapeHtml` (fixat i fas 1). Lägg till vägbeskrivningslänken.
7. **Filter (K1):** komponenten tar redan emot `bars`. Kartsidan läser samma URL-parametrar via `lib/filters.ts` och skickar in filtrerade barer. Uppdatera källan med `setData` i stället för att bygga om kartan.
8. **Egen position (K3):** återanvänd `useUserLocation()` från F1, visa en blå prick som GeoJSON-punkt och en knapp ”Centrera på mig” nere till höger (`map.easeTo`).
9. **Städa:** ta bort Leaflet-CSS från unpkg, `.leaflet-*`-reglerna i `globals.css` och beroendena `leaflet` och `@types/leaflet`.
10. **Mät:** Lighthouse på `/map` (mål ≥ 95 a11y) och manuellt test på en mellanklass-Android.

**Det som återanvänds:** sidan `app/map/page.tsx`, `dynamic(..., { ssr: false })`, pris- och färglogiken, popupens innehåll och legenden. Det som skrivs om är initieringen och markörhanteringen, ungefär 60 % av filen.

## Uppskattad insats

| Del | Insats |
|---|---|
| MapLibre + OpenFreeMap, ljus/mörk stil (K4), popup, legend | 1 dag |
| Prisnålar + klustring (K2) | 1 dag |
| Egen position + Centrera på mig (K3) | 0,5 dag |
| Gemensamma URL-filter för lista och karta (K1, tillsammans med F2) | 0,5–1 dag |
| `/api/geocode` med Photon + Nominatim-reserv, adressfält i `/submit`, kolumnen `osm_id` (C1) | 1 dag |
| Test, Lighthouse, finputs | 0,5 dag |
| **Totalt** | **≈ 4,5–5 dagar** |

Reserv (inte i estimatet): egen hosting av en PMTiles- eller OpenFreeMap-extrakt om den publika instansen visar sig opålitlig, ungefär 0,5–1 dag.

## Beslut som behövs

1. Godkänn MapLibre + OpenFreeMap + Photon innan K1/K2/K3/C1 byggs om.
2. Ska Google Maps-nyckeln användas till något alls? Förslaget ovan behöver den inte.
