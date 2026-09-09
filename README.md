# 🏃 Kokotí Výzva

**Dokážeš-li to, není to jen sen!**

Progresivní webová aplikace pro sledování sportovní výzvy mezi partou kamarádů. Kombinuje běh, kolo, plavání, výstupy a abstinenci od alkoholu do bodovacího systému s live žebříčkem, statistikami a brutálním hecováním.

[![Vercel Deploy](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

## 📋 Obsah

- [Funkce](#-funkce)
- [Technologie](#-technologie)
- [Databázové schéma](#-databázové-schéma)
- [Bodovací systém](#-bodovací-systém)
- [Instalace](#-instalace)
- [Struktura projektu](#-struktura-projektu)
- [Deployment](#-deployment)

## ✨ Funkce

### 🏆 Základní funkce
- **Live žebříček** - Real-time pořadí všech účastníků
- **Denní zápis aktivit** - Běh, kolo, bazén, kokotmetry (převýšení), alkohol
- **Pokročilé statistiky** - Streaky, breakdown bodů, týdenní přehledy
- **Grafické vizualizace** - Vývoj bodů v čase, koláčové grafy

### 🎯 Statistiky & Analytics
- **Konzistence** - Skóre 0-100 podle aktivních dní a délek pauz
- **Porovnání s průměrem** - Jak si vedeš oproti celé skupině
- **Aktivita podle dne v týdnu** - Zjisti svoje nejaktivnější dny
- **Týdenní breakdown** - Detailní rozpad výsledků po týdnech
- **Streaky (série)** - Nejdelší a aktuální série dní v řadě

### 🏅 Achievements & Badges
- **💪 Achievement badges** - Kokotí Legenda, Ultra Kokot, Warrior, atd.
- **💩 Shame badges** - Týden Nula, Alkáč, pro líné kokoty
- **😱 Gauge of Shame** - Měřič hanby (0-100%) s motivačními texty
- **🏅 Týdenní (ne)ocenění** - Mrdka týdne, Alkáč týdne

### 💬 Instantní hejt
Brutální live hecovací zprávy podle aktuálního stavu:
- 😱 Někdo tě předběhl
- 💀 Dlouhá pauza bez aktivity
- 💩 Jsi poslední v žebříčku
- 🍺 Pivo místo sportu
- 👑 Motivace pro první místo

### 🔒 Bezpečnost
- Globální heslo pro přístup k aplikaci
- Chráněné nastavení výzvy (období, termíny)
- Potvrzení při přepínání mezi uživateli

## 🛠 Technologie

### Frontend
- **[Next.js 16.3.3](https://nextjs.org/)** - React framework s Turbopack
- **[React 19](https://react.dev/)** - UI knihovna
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Recharts](https://recharts.org/)** - Grafy a vizualizace
- **[Lucide React](https://lucide.dev/)** - Ikony

### Backend & Databáze
- **[Supabase](https://supabase.com/)** - PostgreSQL databáze + Auth
- **PostgreSQL** - Relační databáze
- **SQL Views** - Pro optimalizované dotazy (leaderboard)

### Deployment & Hosting
- **[Vercel](https://vercel.com/)** - Automatický deployment z Git
- **Edge Functions** - Serverless API endpoints

### Developer Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control

## 🗄️ Databázové schéma

### Tabulka: `users`
Uživatelé výzvy.

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | UUID | Primární klíč |
| `name` | TEXT | Jméno uživatele |
| `email` | TEXT | Email (volitelný) |
| `avatar_url` | TEXT | URL avatara (volitelný) |
| `initials` | TEXT | Iniciály pro zobrazení |
| `color` | TEXT | CSS třída pro barvu avatara |
| `created_at` | TIMESTAMP | Datum vytvoření |

### Tabulka: `activities`
Denní záznamy aktivit.

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | UUID | Primární klíč |
| `user_id` | UUID | Foreign key na `users` |
| `date` | DATE | Datum aktivity |
| `beh` | NUMERIC | Běh v kilometrech |
| `kolo` | NUMERIC | Kolo v kilometrech |
| `bazen` | NUMERIC | Bazén v kilometrech |
| `kokotmetr` | INTEGER | Převýšení v metrech |
| `no_alcohol` | BOOLEAN | Den bez alkoholu |
| `created_at` | TIMESTAMP | Datum vytvoření záznamu |
| `updated_at` | TIMESTAMP | Datum poslední úpravy |

**Unique constraint:** `(user_id, date)` - jeden záznam na den

### View: `leaderboard`
Materialized view pro optimalizované načítání žebříčku.

```sql
CREATE VIEW leaderboard AS
SELECT
  u.id,
  u.name,
  u.initials,
  u.color,
  u.avatar_url,
  COALESCE(SUM(a.beh), 0) as total_beh,
  COALESCE(SUM(a.kolo), 0) as total_kolo,
  COALESCE(SUM(a.bazen), 0) as total_bazen,
  COALESCE(SUM(a.kokotmetr), 0) as total_kokotmetr,
  COUNT(CASE WHEN a.no_alcohol THEN 1 END) as sober_days,
  COALESCE(
    SUM(a.beh) +
    FLOOR(SUM(a.kolo) / 10) * 2 +
    FLOOR(SUM(a.bazen)) * 2 +
    SUM(a.kokotmetr) +
    COUNT(CASE WHEN a.no_alcohol THEN 1 END),
    0
  ) as total_points
FROM users u
LEFT JOIN activities a ON u.id = a.user_id
GROUP BY u.id, u.name, u.initials, u.color, u.avatar_url
ORDER BY total_points DESC;
```

## 🎯 Bodovací systém

| Aktivita | Body | Poznámka |
|----------|------|----------|
| **1 km běhu** | 1 bod | - |
| **10 km na kole** | 2 body | Zaokrouhleno dolů |
| **1 km v bazénu** | 2 body | Bonus za plavání |
| **100m převýšení** | 1 bod | "Kokotmetr" |
| **Den bez alkoholu** | 1 bod | - |

### Speciální pravidla
- **Rejžův sluníčkový den:** Bod za každé pivo, běhání ten den za 0
- **Fotbálky se počítají** jako aktivita
- **Badminton v hale se nepočítá**

### Pokuty
- **Poslední místo:** Sud 50L dle vlastního výběru
- **Pod 200 bodů:** 1000 Kč do kasy

## 🚀 Instalace

### Prerekvizity
- Node.js 18+
- pnpm (nebo npm/yarn)
- Supabase účet

### Lokální development

1. **Klonuj repozitář**
```bash
git clone https://github.com/marek-hurt/kokoti-vyzva.git
cd kokoti-vyzva
```

2. **Nainstaluj dependencies**
```bash
pnpm install
```

3. **Nastav environment variables**
Vytvoř `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tvoje_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvuj_supabase_anon_key
```

4. **Spusť development server**
```bash
pnpm dev
```

Aplikace poběží na [http://localhost:3000](http://localhost:3000)

### Supabase setup

1. Vytvoř nový projekt v [Supabase](https://supabase.com)
2. Spusť SQL skripty pro vytvoření tabulek:

```sql
-- Vytvoř tabulku users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vytvoř tabulku activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  beh NUMERIC DEFAULT 0,
  kolo NUMERIC DEFAULT 0,
  bazen NUMERIC DEFAULT 0,
  kokotmetr INTEGER DEFAULT 0,
  no_alcohol BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Vytvoř view pro leaderboard
CREATE VIEW leaderboard AS
SELECT
  u.id,
  u.name,
  u.initials,
  u.color,
  u.avatar_url,
  COALESCE(SUM(a.beh), 0) as total_beh,
  COALESCE(SUM(a.kolo), 0) as total_kolo,
  COALESCE(SUM(a.bazen), 0) as total_bazen,
  COALESCE(SUM(a.kokotmetr), 0) as total_kokotmetr,
  COUNT(CASE WHEN a.no_alcohol THEN 1 END) as sober_days,
  COALESCE(
    SUM(a.beh) +
    FLOOR(SUM(a.kolo) / 10) * 2 +
    FLOOR(SUM(a.bazen)) * 2 +
    SUM(a.kokotmetr) +
    COUNT(CASE WHEN a.no_alcohol THEN 1 END),
    0
  ) as total_points
FROM users u
LEFT JOIN activities a ON u.id = a.user_id
GROUP BY u.id, u.name, u.initials, u.color, u.avatar_url
ORDER BY total_points DESC;
```

3. Nastav Row Level Security (RLS) polícy podle potřeby

## 📁 Struktura projektu

```
kokoti-vyzva/
├── app/
│   ├── globals.css          # Globální styly
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Hlavní stránka (all-in-one)
├── lib/
│   └── supabase.ts          # Supabase client + API funkce
├── public/                  # Statické soubory
├── .env.local              # Environment variables (git ignored)
├── next.config.mjs         # Next.js konfigurace
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript konfigurace
└── README.md               # Tato dokumentace
```

### Klíčové soubory

- **`app/page.tsx`** - Celá aplikace v jednom souboru (SPA)
  - Všechny záložky (Home, Tabulka, Po dnech, Statistiky, Info, Nastavení)
  - State management
  - UI komponenty

- **`lib/supabase.ts`** - Backend logika
  - Supabase client
  - TypeScript typy
  - API funkce pro CRUD operace
  - Výpočty statistik, achievements, trash talk

## 🌐 Deployment

### Vercel (doporučeno)

1. Push kód do GitHub repozitáře
2. Importuj projekt do [Vercel](https://vercel.com)
3. Nastav environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy! ✅

Vercel automaticky buildí a deployuje při každém push do `main` větve.

### Manuální build

```bash
pnpm build
pnpm start
```

## 🔐 Přístupové údaje

### Globální heslo
Heslo pro přístup do aplikace je uložené v `app/page.tsx`:
```typescript
const CORRECT_PASSWORD = 'Vymrdanec2026*'
```

### Nastavení heslo
Heslo pro úpravu období výzvy:
```typescript
settingsPassword === 'kokot'
```

## 🎨 Vzhled & UX

- **Tmavý theme** - Převážně černé pozadí se zelenými akcenty
- **Mobile-first** - Optimalizováno pro mobily
- **PWA ready** - Možnost instalace jako aplikace
- **Smooth animations** - Progress bary, transitions
- **Emoji everywhere** - 🔥 Maximální vtip a srozumitelnost

## 📝 Vývoj

### Přidání nového uživatele

```sql
INSERT INTO users (name, initials, color)
VALUES ('Nový Kokot', 'NK', 'avatar-blue');
```

### Přidání aktivity přes Supabase client

```typescript
await addActivity({
  user_id: 'uuid-uzivatele',
  date: '2026-09-09',
  beh: 10.5,
  kolo: 25,
  bazen: 0,
  kokotmetr: 150,
  no_alcohol: true
})
```

## 🤝 Přispívání

Pokud chceš přidat feature nebo opravit bug:

1. Fork repozitář
2. Vytvoř feature branch (`git checkout -b feature/amazing-feature`)
3. Commit změny (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otevři Pull Request

## 📄 Licence

Tento projekt je vytvořen pro soukromé účely party kamarádů. Použití na vlastní riziko! 😄

## 🙏 Poděkování

- **Next.js team** za skvělý framework
- **Supabase** za backend-as-a-service
- **Vercel** za hosting
- **Všem kokotům** co se výzvy účastní! 🍺

---

**Vytvořeno s ❤️ a 🤖 pomocí [Claude Code](https://claude.com/claude-code)**

*Dokážeš-li to, není to jen sen!* 🏃‍♂️💪
