#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
skrapa_krogar.py — Kartlägger ölpriser, Guinness och happy hour på svenska krogar
(huvudfokus Stockholm).

Hybridmetod per krog:
  1. requests  — hämtar sidan statiskt och letar efter strukturerad data:
                 JSON-LD, inbäddad JSON (t.ex. __NEXT_DATA__) och interna
                 API-adresser som sidan själv refererar till.
  2. Playwright — om steg 1 inte hittar något pris renderas sidan i headless
                 Chromium. Då fångas även sidans egna JSON-anrop (XHR/fetch),
                 och menyflikar/menylänkar klickas igenom.

Kör:
  python scripts/skrapa_krogar.py --upptack-osm --max 25
  python scripts/skrapa_krogar.py --kallor scripts/krogar_kallor.exempel.json

Priserna tolkas heuristiskt ur fri text. Se resultatet som prisförslag som ska
granskas, inte som verifierade priser.
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import random
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

log = logging.getLogger("skrapa_krogar")


# ════════════════════════════════════════════════════════════════════════════
# 1. KONFIGURATION
# ════════════════════════════════════════════════════════════════════════════

# Roterande user-agents — en slumpas fram per anrop
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
]

DELAY_MIN_S, DELAY_MAX_S = 2.0, 5.0   # paus mellan anrop (sekunder)
TIMEOUT_S = 20                        # timeout för requests
MAX_UNDERSIDOR = 4                    # max antal menysidor per krog
MAX_API_ANROP = 3                     # max antal interna API-adresser per krog
PRIS_MIN, PRIS_MAX = 20.0, 400.0      # rimligt intervall för ett ölpris i kr

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Länkar/knappar som brukar leda till dryckesmenyn (viktigast först)
MENY_MONSTER = re.compile(
    r"happy|after.?work|dryck|drink|dricka|\böl\b|beer|fatöl|meny|menu|prislista|priser|\bbar\b",
    re.I,
)

# Kända fatölsmärken som brukar säljas som "stor stark"
OLMARKEN = [
    "Mariestads", "Falcon", "Norrlands Guld", "Pripps Blå", "Pripps", "Carlsberg",
    "Tuborg", "Heineken", "Spendrups", "Eriksberg", "Åbro", "Sofiero", "Melleruds",
    "Staropramen", "Pilsner Urquell", "Krusovice", "Krušovice", "Budvar", "Bernard",
    "Stella Artois", "Peroni", "Birra Moretti", "Brooklyn", "Lapin Kulta",
    "Kronenbourg", "Estrella", "Sleepy Bulldog", "Stockholm Lager", "Bryggmästarens",
    "Three Towns", "Norrlands", "Zeunerts", "Jämtlands", "Omnipollo",
]
MARKE_RE = re.compile("|".join(re.escape(m) for m in OLMARKEN), re.I)

STOR_STARK_RE = re.compile(r"stor\s*stark|husets\s+(?:öl|lager|fatöl)|house\s+(?:beer|lager)", re.I)
FATOL_RE = re.compile(r"fatöl|på\s+fat|draught|draft|\b(?:40|50)\s*cl\b|\b0[.,][45]\s*l\b", re.I)
# Rader som INTE är en stor stark (flaskor, små glas, alkoholfritt, annat än öl)
EJ_STOR_STARK_RE = re.compile(
    r"guinness|alkoholfri|\b0[.,]0\b|flask|burk|\b(?:20|25|30|33)\s*cl\b|cider|\bvin\b|shot|drink",
    re.I,
)
# "AW" matchas bara med versaler, annars träffar det mitt i vanliga ord
HAPPY_HOUR_RE = re.compile(r"(?i:happy\s*hours?|after\s*work)|\bAW\b")

# Postnummerprefix → stadsdel i Stockholms innerstad (grov indelning)
POSTNR_STADSDEL = {
    "111": "Norrmalm", "112": "Kungsholmen", "113": "Vasastan", "114": "Östermalm",
    "115": "Östermalm", "116": "Södermalm", "117": "Södermalm", "118": "Södermalm",
    "120": "Hammarby Sjöstad",
}
GAMLA_STAN_POSTNR = range(11127, 11132)   # 111 27–111 31


# ════════════════════════════════════════════════════════════════════════════
# 2. DATAMODELL
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class Krog:
    """Det standardiserade utdataformatet — en post per krog."""
    krog_namn: str
    stad: Optional[str]
    stadsdel: Optional[str]
    gatuadress: Optional[str]
    har_guinness: bool
    guinness_pris_sek: Optional[float]
    standard_stor_stark_namn: Optional[str]
    standard_stor_stark_pris_sek: Optional[float]
    har_happy_hour: bool
    happy_hour_detaljer: Optional[dict]
    datakälla_url: str
    skrapad_tidstämpel: str


@dataclass
class Kalla:
    """En krog att skrapa: startadress plus det vi redan vet om den."""
    url: str
    namn: Optional[str] = None
    stad: Optional[str] = None
    stadsdel: Optional[str] = None
    gatuadress: Optional[str] = None


@dataclass
class Sida:
    """Text (uppdelad i rader) från en hämtad sida eller ett JSON-svar."""
    url: str
    rader: list[str]


# ════════════════════════════════════════════════════════════════════════════
# 3. HTTP-LAGER (requests) — artigt: delay, roterande UA, robots.txt
# ════════════════════════════════════════════════════════════════════════════

class Hamtare:
    """Tunn wrapper kring requests med paus, slumpad user-agent och robots.txt."""

    def __init__(self) -> None:
        self.session = requests.Session()
        self._robots: dict[str, Optional[RobotFileParser]] = {}
        self._senaste_anrop = 0.0

    def slumpad_ua(self) -> str:
        return random.choice(USER_AGENTS)

    def vanta(self) -> None:
        """Slumpad paus (2–5 s) sedan förra anropet, så att ingen server överbelastas."""
        paus = random.uniform(DELAY_MIN_S, DELAY_MAX_S)
        kvar = self._senaste_anrop + paus - time.monotonic()
        if kvar > 0:
            time.sleep(kvar)
        self._senaste_anrop = time.monotonic()

    def tillaten(self, url: str) -> bool:
        """Respekterar robots.txt. Går filen inte att läsa antas sidan vara tillåten."""
        delar = urlparse(url)
        bas = f"{delar.scheme}://{delar.netloc}"
        if bas not in self._robots:
            parser: Optional[RobotFileParser] = None
            try:
                self.vanta()
                svar = self.session.get(
                    bas + "/robots.txt", timeout=TIMEOUT_S,
                    headers={"User-Agent": self.slumpad_ua()},
                )
                if svar.ok and "text" in svar.headers.get("content-type", "text"):
                    parser = RobotFileParser()
                    parser.parse(svar.text.splitlines())
            except requests.RequestException as fel:
                log.debug("robots.txt gick inte att hämta för %s: %s", bas, fel)
            self._robots[bas] = parser
        parser = self._robots[bas]
        return parser is None or parser.can_fetch("*", url)

    def hamta(self, url: str, json_svar: bool = False) -> Optional[requests.Response]:
        """GET med ett omförsök vid 429/5xx. Returnerar None i stället för att kasta."""
        if not self.tillaten(url):
            log.info("  robots.txt tillåter inte %s — hoppar över", url)
            return None
        for forsok in range(2):
            try:
                self.vanta()
                svar = self.session.get(
                    url, timeout=TIMEOUT_S,
                    headers={
                        "User-Agent": self.slumpad_ua(),
                        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.6",
                        "Accept": "application/json" if json_svar else "text/html,*/*;q=0.8",
                    },
                )
                if svar.status_code in (429, 500, 502, 503, 504) and forsok == 0:
                    # Servern ber oss sakta ner — vänta ordentligt och försök en gång till
                    time.sleep(min(float(svar.headers.get("Retry-After", 15) or 15), 60))
                    continue
                if not svar.ok:
                    log.info("  HTTP %s för %s", svar.status_code, url)
                    return None
                return svar
            except (requests.RequestException, ValueError) as fel:
                log.info("  Nätverksfel för %s: %s", url, fel)
        return None


# ════════════════════════════════════════════════════════════════════════════
# 4. UPPTÄCKT AV KROGAR — egen källfil och/eller OpenStreetMap
# ════════════════════════════════════════════════════════════════════════════

def las_kallfil(sokvag: str) -> list[Kalla]:
    """Läser en JSON-lista med krogar: [{"url": ..., "namn": ..., "stadsdel": ...}, ...]."""
    with open(sokvag, encoding="utf-8") as fil:
        poster = json.load(fil)
    kallor = []
    for post in poster:
        if isinstance(post, str):
            post = {"url": post}
        if post.get("url"):
            kallor.append(Kalla(**{k: post.get(k) for k in Kalla.__dataclass_fields__}))
    return kallor


def upptack_via_osm(hamtare: Hamtare, kommun: str, max_antal: int) -> list[Kalla]:
    """Hämtar pubar/barer med webbplats i en kommun från OpenStreetMap (Overpass API)."""
    fraga = f"""
    [out:json][timeout:60];
    area["name"="{kommun}"]["admin_level"="7"]->.a;
    nwr(area.a)["amenity"~"^(pub|bar)$"]["website"];
    out center tags;
    """
    try:
        hamtare.vanta()
        svar = requests.post(
            OVERPASS_URL, data={"data": fraga}, timeout=90,
            headers={"User-Agent": "sunkis-prisskrapa/1.0"},
        )
        svar.raise_for_status()
        element = svar.json().get("elements", [])
    except (requests.RequestException, ValueError) as fel:
        log.error("Kunde inte hämta krogar från OpenStreetMap: %s", fel)
        return []

    kallor = []
    for el in element:
        t = el.get("tags", {})
        url = t.get("website", "").strip()
        if not url:
            continue
        if not url.startswith("http"):
            url = "https://" + url
        gata = " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x)
        kallor.append(Kalla(
            url=url,
            namn=t.get("name"),
            stad=t.get("addr:city") or kommun.replace("s kommun", ""),
            stadsdel=t.get("addr:suburb") or stadsdel_fran_postnr(t.get("addr:postcode")),
            gatuadress=gata or None,
        ))
    random.shuffle(kallor)   # sprid ut anropen i stället för att ta samma krogar varje gång
    return kallor[:max_antal]


def stadsdel_fran_postnr(postnr: Optional[str]) -> Optional[str]:
    """Grov stadsdel utifrån postnummer (bara Stockholms innerstad)."""
    siffror = re.sub(r"\D", "", postnr or "")
    if len(siffror) != 5:
        return None
    if int(siffror) in GAMLA_STAN_POSTNR:
        return "Gamla stan"
    return POSTNR_STADSDEL.get(siffror[:3])


# ════════════════════════════════════════════════════════════════════════════
# 5. FRÅN HTML/JSON TILL TEXTRADER
# ════════════════════════════════════════════════════════════════════════════

def text_till_rader(text: str) -> list[str]:
    """Delar upp text i städade, icke-tomma rader."""
    rader = []
    for rad in text.splitlines():
        rad = re.sub(r"\s+", " ", rad).strip()
        if rad and (not rader or rader[-1] != rad):
            rader.append(rad)
    return rader


def html_till_rader(soppa: BeautifulSoup) -> list[str]:
    """Synlig text ur ett HTML-dokument, en rad per textblock."""
    for tagg in soppa(["script", "style", "noscript", "svg", "template"]):
        tagg.decompose()
    return text_till_rader(soppa.get_text("\n"))


_PRISNYCKEL = re.compile(r"pris|price|amount|cost|belopp", re.I)
_BRUSNYCKEL = re.compile(r"^@|id$|sort|order|position|index|lat|lng|lon|count|width|height|version", re.I)


def json_till_rader(data: Any) -> list[str]:
    """
    Plattar ut godtycklig JSON till textrader så att samma textanalys kan
    användas för API-svar som för HTML. Varje "löv-objekt" blir en rad:
        {"name": "Guinness", "offers": {"price": 89}}  →  "Guinness 89 kr"
    """
    rader: list[str] = []

    def skalarer(obj: dict) -> tuple[list[str], list[str]]:
        """Samlar textvärden och prisvärden i ett objekt (inklusive nästlade objekt)."""
        texter, priser = [], []
        for nyckel, varde in obj.items():
            if isinstance(varde, dict):
                t, p = skalarer(varde)
                texter += t
                priser += p
            elif isinstance(varde, bool) or varde is None or _BRUSNYCKEL.search(str(nyckel)):
                continue
            elif _PRISNYCKEL.search(str(nyckel)) and isinstance(varde, (int, float, str)):
                priser.append(f"{varde} kr" if re.fullmatch(r"[\d.,]+", str(varde)) else str(varde))
            elif isinstance(varde, str) and 0 < len(varde) <= 300 and not varde.startswith("http"):
                texter.append(varde)
        return texter, priser

    def vandra(nod: Any) -> None:
        if isinstance(nod, list):
            for barn in nod:
                vandra(barn)
        elif isinstance(nod, dict):
            har_listor = any(isinstance(v, list) for v in nod.values()) or any(
                isinstance(v, dict) and any(isinstance(x, (list, dict)) for x in v.values())
                for v in nod.values()
            )
            if har_listor:
                # Behållare: egna värden blir en rad, barnen behandlas var för sig
                egna = {k: v for k, v in nod.items() if not isinstance(v, (list, dict))}
                t, p = skalarer(egna)
                if t or p:
                    rader.append(" ".join(t + p))
                for v in nod.values():
                    if isinstance(v, (list, dict)):
                        vandra(v)
            else:
                t, p = skalarer(nod)
                if t or p:
                    rader.append(" ".join(t + p))

    vandra(data)
    return text_till_rader("\n".join(rader))


def inbaddad_json(soppa: BeautifulSoup) -> list[Any]:
    """All JSON som ligger inbäddad i <script>-taggar (JSON-LD, __NEXT_DATA__ m.fl.)."""
    fynd = []
    for skript in soppa.find_all("script"):
        typ = (skript.get("type") or "").lower()
        if "json" not in typ and skript.get("id") != "__NEXT_DATA__":
            continue
        try:
            fynd.append(json.loads(skript.string or skript.get_text() or ""))
        except (json.JSONDecodeError, TypeError):
            continue
    return fynd


def interna_api_adresser(html: str, bas_url: str) -> list[str]:
    """Letar i sidans källkod efter adresser som ser ut som interna JSON-API:er."""
    vard = urlparse(bas_url).netloc
    kandidater = re.findall(
        r"""["'](/[^"'\s<>]{0,200}|https?://[^"'\s<>]{0,200})["']""", html)
    api = []
    for kandidat in kandidater:
        if not re.search(r"/api/|/wp-json/|graphql|\.json(?:\?|$)", kandidat):
            continue
        if re.search(r"manifest|schema\.org|oembed|\.map$|/static/", kandidat):
            continue
        full = urljoin(bas_url, kandidat.replace("\\/", "/"))
        if urlparse(full).netloc == vard and full not in api:
            api.append(full)
    # Adresser som nämner meny/dryck är mest intressanta
    api.sort(key=lambda u: 0 if MENY_MONSTER.search(u) else 1)
    return api[:MAX_API_ANROP]


def menylankar(lankar: Iterable[tuple[str, str]], bas_url: str) -> list[str]:
    """Väljer ut länkar på samma domän som troligen leder till dryckesmeny/happy hour."""
    vard = urlparse(bas_url).netloc.removeprefix("www.")
    valda: list[tuple[int, str]] = []
    for text, href in lankar:
        full = urljoin(bas_url, href or "").split("#")[0]
        if urlparse(full).netloc.removeprefix("www.") != vard or full.rstrip("/") == bas_url.rstrip("/"):
            continue
        if re.search(r"\.(jpe?g|png|webp|gif|svg|zip|docx?)(\?|$)", full, re.I):
            continue
        traff = MENY_MONSTER.search(f"{text} {urlparse(full).path}")
        if traff and full not in [u for _, u in valda]:
            # Lägre tal = viktigare: happy hour/dryck före allmän meny
            prio = 0 if re.search(r"happy|after|dryck|drink|öl|beer", traff.group(0), re.I) else 1
            valda.append((prio, full))
    valda.sort(key=lambda par: par[0])
    return [u for _, u in valda[:MAX_UNDERSIDOR]]


def pdf_till_rader(innehall: bytes) -> list[str]:
    """Text ur en PDF-meny. Kräver pypdf (valfritt) — utan det hoppas PDF:er över."""
    try:
        from pypdf import PdfReader
    except ImportError:
        log.debug("  pypdf saknas — PDF-meny hoppas över")
        return []
    try:
        lasare = PdfReader(io.BytesIO(innehall))
        return text_till_rader("\n".join(s.extract_text() or "" for s in lasare.pages[:10]))
    except Exception as fel:   # pypdf kastar många olika fel på trasiga PDF:er
        log.debug("  PDF gick inte att läsa: %s", fel)
        return []


# ════════════════════════════════════════════════════════════════════════════
# 6. TEXTANALYS — priser, Guinness, stor stark, happy hour
# ════════════════════════════════════════════════════════════════════════════

_VALUTA = r"(?:kr\b|sek\b|kronor\b|:-|;-|,-)"
_VOLYM_RE = re.compile(r"\d+(?:[.,]\d+)?\s*(?:cl|ml|dl|liter|l|%|vol)(?![a-zåäö])", re.I)
_KLOCKSLAG_RE = re.compile(rf"\b\d{{1,2}}[:.]\d{{2}}\b(?!\s*{_VALUTA})", re.I)
_INTERVALL_RE = re.compile(r"\b\d{1,2}\s*[-–—]\s*\d{1,2}\b")
_PRIS_MED_VALUTA_RE = re.compile(rf"(?<![\d.,])(\d{{2,3}})(?:[.,](\d{{2}}))?\s*{_VALUTA}", re.I)
_PRIS_VALUTA_FORE_RE = re.compile(r"\b(?:kr|sek)\.?\s*(\d{2,3})\b", re.I)
_PRIS_SIST_RE = re.compile(r"(?<![\d.,])((?:\d{2,3}\s*/\s*)*\d{2,3})\s*$")


def priser_i_rad(rad: str) -> list[float]:
    """
    Alla rimliga priser i en textrad. Volymer (50 cl), alkoholhalt (5,2 %) och
    klockslag (16:00) rensas bort först så att de inte misstas för priser.
    Tal utan valuta godtas bara sist på raden ("Falcon 50 cl 79").
    """
    stad = _KLOCKSLAG_RE.sub(" ", _VOLYM_RE.sub(" ", rad))
    # "79/89 kr" → båda talen är priser (oftast 40 cl / 50 cl)
    stad = re.sub(rf"(\d{{2,3}})\s*/\s*(?=\d{{2,3}}\s*{_VALUTA})", r"\1 kr ", stad, flags=re.I)

    fynd = [float(f"{h}.{d or 0}") for h, d in _PRIS_MED_VALUTA_RE.findall(stad)]
    fynd += [float(h) for h in _PRIS_VALUTA_FORE_RE.findall(stad)]
    if not fynd:
        sist = _PRIS_SIST_RE.search(_INTERVALL_RE.sub(" ", stad).strip())
        if sist:
            fynd = [float(x) for x in re.split(r"\s*/\s*", sist.group(1))]
    return [p for p in fynd if PRIS_MIN <= p <= PRIS_MAX]


def _ar_ren_prisrad(rad: str) -> bool:
    """Sant om raden bara består av pris/volym, t.ex. "89 kr" eller "40 cl 79:-"."""
    return not re.search(r"[a-zåäö]{3,}", _VOLYM_RE.sub(" ", rad), re.I)


def pris_for_rad(rader: list[str], i: int) -> Optional[float]:
    """
    Priset som hör till rad i. Ofta ligger namn och pris i olika HTML-element
    och hamnar då på olika rader — därför godtas även rena prisrader strax efter.
    Finns flera priser (t.ex. 40/50 cl) väljs det högsta, dvs. största glaset.
    """
    priser = priser_i_rad(rader[i])
    if not priser:
        for j in range(i + 1, min(i + 4, len(rader))):
            if not _ar_ren_prisrad(rader[j]):
                # Raden efter får vara en kort beskrivning ("Irish stout 4,2 %"), men bara en
                if j == i + 1 and len(rader[j]) < 60 and not MARKE_RE.search(rader[j]):
                    continue
                break
            priser = priser_i_rad(rader[j])
            if priser:
                break
    return max(priser) if priser else None


def hitta_happy_hour(rader: list[str]) -> tuple[Optional[dict], set[int]]:
    """
    Letar efter happy hour/after work. Returnerar detaljer samt index för de
    rader som hör till erbjudandet (så att de inte tolkas som ordinarie priser).
    """
    dag = r"(?:mån|tis|ons|tors|fre|lör|sön)[a-zåäö]*"
    dagar_re = re.compile(rf"{dag}(?:\s*(?:[-–—]|till|och|&|,)\s*{dag})*|alla\s+dagar|vardagar|dagligen|helger", re.I)
    tid_re = re.compile(
        r"(?:kl\.?\s*)?\b([01]?\d|2[0-4])(?:[:.]([0-5]\d))?\s*(?:[-–—]|till)\s*([01]?\d|2[0-4])(?:[:.]([0-5]\d))?\b",
        re.I)

    tider: list[dict] = []
    priser: list[dict] = []
    anvanda: set[int] = set()
    for i, rad in enumerate(rader):
        if not HAPPY_HOUR_RE.search(rad):
            continue
        # Erbjudandet beskrivs oftast på samma rad eller de närmaste raderna efter
        for j in range(i, min(i + 4, len(rader))):
            if j > i and len(rader[j]) > 160:
                break
            anvanda.add(j)
            for t in tid_re.finditer(rader[j]):
                d = dagar_re.search(rader[j])
                post = {
                    "dagar": d.group(0).lower() if d else None,
                    "start": f"{int(t.group(1)):02d}:{t.group(2) or '00'}",
                    "slut": f"{int(t.group(3)):02d}:{t.group(4) or '00'}",
                }
                if post not in tider:
                    tider.append(post)
            for p in priser_i_rad(rader[j]):
                post = {"beskrivning": rader[j][:140], "pris_sek": p}
                if post not in priser:
                    priser.append(post)
    if not anvanda:
        return None, set()
    return {"tider": tider, "priser": priser}, anvanda


def analysera_rader(rader: list[str]) -> dict:
    """Plockar ut alla datapunkter ur en sidas textrader."""
    happy_hour, hh_rader = hitta_happy_hour(rader)
    resultat: dict[str, Any] = {
        "har_guinness": False, "guinness_pris_sek": None,
        "standard_stor_stark_namn": None, "standard_stor_stark_pris_sek": None,
        "har_happy_hour": happy_hour is not None, "happy_hour_detaljer": happy_hour,
    }

    kandidater: list[tuple[int, float, Optional[str]]] = []   # (prioritet, pris, märke)
    for i, rad in enumerate(rader):
        if len(rad) > 200:          # löptext, inte en menyrad
            if re.search(r"guinness", rad, re.I):
                resultat["har_guinness"] = True
            continue

        # ── Guinness ──
        if re.search(r"guinness", rad, re.I) and not re.search(r"alkoholfri|0[.,]0", rad, re.I):
            resultat["har_guinness"] = True
            if i not in hh_rader and resultat["guinness_pris_sek"] is None:
                resultat["guinness_pris_sek"] = pris_for_rad(rader, i)
            continue

        # ── Stor stark ──
        if i in hh_rader or EJ_STOR_STARK_RE.search(rad):
            continue
        marke = MARKE_RE.search(rad)
        ar_stor_stark = STOR_STARK_RE.search(rad)
        if not (marke or ar_stor_stark):
            continue
        pris = pris_for_rad(rader, i)
        if pris is None or pris > 150:
            continue
        # Uttalad "stor stark"/"husets öl" väger tyngst, därefter märke på fat
        prio = 0 if ar_stor_stark else (1 if FATOL_RE.search(rad) else 2)
        kandidater.append((prio, pris, marke.group(0).title() if marke else None))

    if kandidater:
        # Bästa prioritet först, sedan billigast = husets standardöl
        _, pris, marke = min(kandidater, key=lambda k: (k[0], k[1]))
        resultat["standard_stor_stark_pris_sek"] = pris
        resultat["standard_stor_stark_namn"] = marke
    return resultat


def metadata_fran_jsonld(json_block: list[Any]) -> dict:
    """Namn och adress ur schema.org-data (Restaurant, BarOrPub m.fl.)."""
    meta: dict[str, Optional[str]] = {}

    def vandra(nod: Any) -> None:
        if isinstance(nod, list):
            for barn in nod:
                vandra(barn)
        elif isinstance(nod, dict):
            adress = nod.get("address")
            if isinstance(adress, dict) and adress.get("streetAddress") and "gatuadress" not in meta:
                meta["gatuadress"] = str(adress["streetAddress"]).strip()
                meta["stad"] = adress.get("addressLocality")
                meta["postnr"] = adress.get("postalCode")
                if isinstance(nod.get("name"), str):
                    meta["namn"] = nod["name"].strip()
            for varde in nod.values():
                if isinstance(varde, (list, dict)):
                    vandra(varde)

    vandra(json_block)
    return meta


# ════════════════════════════════════════════════════════════════════════════
# 7. STEG 1 — STATISK SKRAPNING MED REQUESTS
# ════════════════════════════════════════════════════════════════════════════

def skrapa_statiskt(hamtare: Hamtare, url: str) -> tuple[list[Sida], dict]:
    """Hämtar startsida, inbäddad JSON, interna API:er och menysidor utan webbläsare."""
    sidor: list[Sida] = []
    meta: dict = {}

    svar = hamtare.hamta(url)
    if svar is None:
        return sidor, meta
    url = svar.url   # följ ev. omdirigering
    soppa = BeautifulSoup(svar.content, "lxml")   # bytes: BeautifulSoup hittar rätt teckenkodning

    # Sidans namn som reserv om källan saknar det
    og = soppa.find("meta", property="og:site_name")
    meta["namn"] = (og.get("content") if og else None) or (soppa.title.string.strip() if soppa.title and soppa.title.string else None)

    # a) Inbäddad JSON — ofta komplett menydata utan att behöva rendera något
    block = inbaddad_json(soppa)
    meta.update({k: v for k, v in metadata_fran_jsonld(block).items() if v})
    for data in block:
        rader = json_till_rader(data)
        if rader:
            sidor.append(Sida(url, rader))

    # b) Interna API-adresser som sidan själv pekar ut
    for api_url in interna_api_adresser(svar.text, url):
        api_svar = hamtare.hamta(api_url, json_svar=True)
        if api_svar is None:
            continue
        try:
            sidor.append(Sida(api_url, json_till_rader(api_svar.json())))
            log.info("  Internt API hittat: %s", api_url)
        except ValueError:
            continue

    # c) Synlig text på startsidan och på menysidorna
    lankar = [(a.get_text(" ", strip=True), a["href"]) for a in soppa.find_all("a", href=True)]
    sidor.append(Sida(url, html_till_rader(soppa)))
    for lank in menylankar(lankar, url):
        under = hamtare.hamta(lank)
        if under is None:
            continue
        if "pdf" in under.headers.get("content-type", "") or lank.lower().endswith(".pdf"):
            rader = pdf_till_rader(under.content)
        else:
            under_soppa = BeautifulSoup(under.content, "lxml")
            for data in inbaddad_json(under_soppa):
                sidor.append(Sida(lank, json_till_rader(data)))
            rader = html_till_rader(under_soppa)
        if rader:
            sidor.append(Sida(lank, rader))
    return sidor, meta


# ════════════════════════════════════════════════════════════════════════════
# 8. STEG 2 — DYNAMISK SKRAPNING MED PLAYWRIGHT
# ════════════════════════════════════════════════════════════════════════════

class Webblasare:
    """Headless Chromium som startas först när den behövs och återanvänds mellan krogar."""

    def __init__(self, hamtare: Hamtare) -> None:
        self.hamtare = hamtare
        self._pw = None
        self._browser = None

    def _starta(self) -> None:
        if self._browser is None:
            from playwright.sync_api import sync_playwright   # importeras sent: valfritt beroende
            self._pw = sync_playwright().start()
            # CHROMIUM_PATH kan peka ut en redan installerad Chromium
            self._browser = self._pw.chromium.launch(
                headless=True, executable_path=os.environ.get("CHROMIUM_PATH") or None)

    def stang(self) -> None:
        try:
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        except Exception as fel:
            log.debug("Fel vid stängning av webbläsaren: %s", fel)

    def skrapa(self, url: str) -> list[Sida]:
        """Renderar sidan, fångar dess JSON-anrop och klickar igenom menyn."""
        self._starta()
        sidor: list[Sida] = []
        kontext = self._browser.new_context(
            user_agent=self.hamtare.slumpad_ua(), locale="sv-SE",
            viewport={"width": 1366, "height": 900},
        )
        try:
            flik = kontext.new_page()

            def fanga_json(svar) -> None:
                """Sparar JSON-svar från sidans egna XHR/fetch-anrop (de 'dolda' API:erna)."""
                try:
                    if svar.request.resource_type not in ("xhr", "fetch"):
                        return
                    if "json" not in (svar.headers.get("content-type") or ""):
                        return
                    rader = json_till_rader(svar.json())
                    if rader:
                        sidor.append(Sida(svar.url, rader))
                except Exception:
                    pass   # svaret kan vara tomt, avbrutet eller inte JSON trots rubriken

            flik.on("response", fanga_json)

            if not self._ga_till(flik, url):
                return sidor
            self._stang_cookieruta(flik)
            sidor.append(Sida(flik.url, text_till_rader(flik.inner_text("body"))))

            # Flikar/knappar utan egen adress ("Dryck", "Öl", "Happy hour") klickas på plats
            self._klicka_menyflikar(flik, sidor)

            # Menylänkar i den renderade sidan besöks en i taget
            lankar = flik.eval_on_selector_all(
                "a[href]", "els => els.map(e => [e.innerText || '', e.href])")
            for lank in menylankar(lankar, flik.url):
                if lank.lower().endswith(".pdf") or not self._ga_till(flik, lank):
                    continue
                self._stang_cookieruta(flik)
                sidor.append(Sida(flik.url, text_till_rader(flik.inner_text("body"))))
                self._klicka_menyflikar(flik, sidor)
        finally:
            kontext.close()
        return sidor

    def _ga_till(self, flik, url: str) -> bool:
        """Navigerar artigt (robots.txt + paus). Returnerar False om sidan inte gick att ladda."""
        if not self.hamtare.tillaten(url):
            log.info("  robots.txt tillåter inte %s — hoppar över", url)
            return False
        self.hamtare.vanta()
        try:
            svar = flik.goto(url, wait_until="domcontentloaded", timeout=30_000)
            if svar is not None and svar.status >= 400:
                log.info("  HTTP %s i webbläsaren för %s", svar.status, url)
                return False
            try:
                # Vänta in sidans egna dataanrop, men fastna inte på sidor som aldrig blir tysta
                flik.wait_for_load_state("networkidle", timeout=8_000)
            except Exception:
                pass
            return True
        except Exception as fel:
            log.info("  Webbläsaren kunde inte ladda %s: %s", url, str(fel).splitlines()[0])
            return False

    def _stang_cookieruta(self, flik) -> None:
        """Klickar bort cookie-dialogen om den skymmer innehållet."""
        monster = re.compile(r"^(acceptera|godkänn|tillåt|jag förstår|ok|accept)( alla| all| cookies)*$", re.I)
        try:
            knapp = flik.get_by_role("button", name=monster).first
            if knapp.is_visible(timeout=800):
                knapp.click(timeout=2_000)
        except Exception:
            pass

    def _klicka_menyflikar(self, flik, sidor: list[Sida]) -> None:
        """Klickar på flikar/knappar som visar dryckesmenyn utan att byta sida."""
        monster = re.compile(r"dryck|drink|\böl\b|beer|fatöl|happy|after\s*work", re.I)
        for roll in ("tab", "button"):
            try:
                element = flik.get_by_role(roll, name=monster)
                for n in range(min(element.count(), 4)):
                    try:
                        element.nth(n).click(timeout=2_000)
                        flik.wait_for_timeout(800)
                        sidor.append(Sida(flik.url, text_till_rader(flik.inner_text("body"))))
                    except Exception:
                        continue   # elementet kan vara dolt eller ha försvunnit
            except Exception:
                continue


# ════════════════════════════════════════════════════════════════════════════
# 9. ORKESTRERING — en krog i taget, med felhantering
# ════════════════════════════════════════════════════════════════════════════

def sla_ihop(sidor: list[Sida], start_url: str) -> tuple[dict, str]:
    """Analyserar varje sida för sig och slår ihop fynden. Returnerar (data, källadress)."""
    total: dict[str, Any] = {
        "har_guinness": False, "guinness_pris_sek": None,
        "standard_stor_stark_namn": None, "standard_stor_stark_pris_sek": None,
        "har_happy_hour": False, "happy_hour_detaljer": None,
    }
    kalla = None
    for sida in sidor:
        try:
            fynd = analysera_rader(sida.rader)
        except Exception as fel:   # en konstig sida får inte fälla hela krogen
            log.debug("  Analysfel för %s: %s", sida.url, fel)
            continue

        total["har_guinness"] = total["har_guinness"] or fynd["har_guinness"]
        if total["guinness_pris_sek"] is None and fynd["guinness_pris_sek"] is not None:
            total["guinness_pris_sek"] = fynd["guinness_pris_sek"]
            kalla = kalla or sida.url
        if total["standard_stor_stark_pris_sek"] is None and fynd["standard_stor_stark_pris_sek"] is not None:
            total["standard_stor_stark_pris_sek"] = fynd["standard_stor_stark_pris_sek"]
            total["standard_stor_stark_namn"] = fynd["standard_stor_stark_namn"]
            kalla = sida.url   # sidan med ölpriset är den viktigaste källan
        if fynd["har_happy_hour"]:
            total["har_happy_hour"] = True
            detaljer = total["happy_hour_detaljer"] or {"tider": [], "priser": []}
            for nyckel in ("tider", "priser"):
                detaljer[nyckel] += [x for x in fynd["happy_hour_detaljer"][nyckel] if x not in detaljer[nyckel]]
            total["happy_hour_detaljer"] = detaljer
    return total, kalla or start_url


def skrapa_krog(kalla: Kalla, hamtare: Hamtare, webblasare: Optional[Webblasare]) -> Optional[Krog]:
    """Skrapar en krog: först statiskt, sedan med webbläsare om inget pris hittades."""
    sidor, meta = skrapa_statiskt(hamtare, kalla.url)
    data, kall_url = sla_ihop(sidor, kalla.url)

    if data["standard_stor_stark_pris_sek"] is None and webblasare is not None:
        log.info("  Inget pris i statisk HTML — provar Playwright")
        try:
            sidor += webblasare.skrapa(kalla.url)
            data, kall_url = sla_ihop(sidor, kalla.url)
        except Exception as fel:
            log.warning("  Playwright misslyckades för %s: %s", kalla.url, str(fel).splitlines()[0])

    if not sidor:
        return None   # sidan gick inte att nå alls

    stad = kalla.stad or meta.get("stad")
    return Krog(
        krog_namn=kalla.namn or meta.get("namn") or urlparse(kalla.url).netloc,
        stad=stad,
        stadsdel=kalla.stadsdel or stadsdel_fran_postnr(meta.get("postnr")),
        gatuadress=kalla.gatuadress or meta.get("gatuadress"),
        datakälla_url=kall_url,
        skrapad_tidstämpel=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **data,
    )


def kor(kallor: list[Kalla], ut_fil: str, anvand_playwright: bool) -> list[Krog]:
    """Går igenom alla krogar och skriver resultatet till JSON efter varje krog."""
    hamtare = Hamtare()
    webblasare = Webblasare(hamtare) if anvand_playwright else None
    resultat: list[Krog] = []
    try:
        for nr, kalla in enumerate(kallor, 1):
            log.info("[%d/%d] %s — %s", nr, len(kallor), kalla.namn or "?", kalla.url)
            try:
                krog = skrapa_krog(kalla, hamtare, webblasare)
            except Exception as fel:
                # Sista skyddsnätet: en trasig krogsida får aldrig stoppa hela körningen
                log.exception("  Oväntat fel för %s: %s", kalla.url, fel)
                continue
            if krog is None:
                log.info("  Ingen data — hoppar över")
                continue
            resultat.append(krog)
            log.info("  stor stark: %s %s kr | Guinness: %s (%s kr) | happy hour: %s",
                     krog.standard_stor_stark_namn or "-", krog.standard_stor_stark_pris_sek or "-",
                     "ja" if krog.har_guinness else "nej", krog.guinness_pris_sek or "-",
                     "ja" if krog.har_happy_hour else "nej")
            # Spara löpande så att en avbruten körning inte tappar det som redan hämtats
            with open(ut_fil, "w", encoding="utf-8") as fil:
                json.dump([asdict(k) for k in resultat], fil, ensure_ascii=False, indent=2)
    finally:
        if webblasare:
            webblasare.stang()
    return resultat


# ════════════════════════════════════════════════════════════════════════════
# 10. KOMMANDORAD
# ════════════════════════════════════════════════════════════════════════════

def main() -> int:
    parser = argparse.ArgumentParser(description="Skrapar ölpriser, Guinness och happy hour från krogars webbplatser.")
    parser.add_argument("--kallor", help="JSON-fil med krogar att skrapa (se krogar_kallor.exempel.json)")
    parser.add_argument("--upptack-osm", action="store_true", help="Hitta krogar med webbplats via OpenStreetMap")
    parser.add_argument("--kommun", default="Stockholms kommun", help="Kommun för --upptack-osm (standard: Stockholms kommun)")
    parser.add_argument("--max", type=int, default=25, help="Max antal krogar per körning (standard: 25)")
    parser.add_argument("--ut", default="krogar.json", help="Utdatafil (standard: krogar.json)")
    parser.add_argument("--ingen-playwright", action="store_true", help="Kör bara det statiska steget")
    parser.add_argument("-v", "--verbose", action="store_true", help="Utförlig loggning")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

    kallor: list[Kalla] = []
    if args.kallor:
        kallor += las_kallfil(args.kallor)
    if args.upptack_osm:
        kallor += upptack_via_osm(Hamtare(), args.kommun, args.max)
    if not (args.kallor or args.upptack_osm):
        parser.error("Ange --kallor FIL och/eller --upptack-osm")
    if not kallor:
        log.error("Inga krogar att skrapa — källfilen var tom eller upptäckten misslyckades")
        return 1

    # Samma webbplats ska bara skrapas en gång per körning
    unika = list({k.url.rstrip("/").lower(): k for k in reversed(kallor)}.values())[::-1][:args.max]

    resultat = kor(unika, args.ut, anvand_playwright=not args.ingen_playwright)
    med_pris = sum(1 for k in resultat if k.standard_stor_stark_pris_sek is not None)
    log.info("Klart: %d krogar sparade i %s (%d med ölpris)", len(resultat), args.ut, med_pris)
    return 0


if __name__ == "__main__":
    sys.exit(main())
