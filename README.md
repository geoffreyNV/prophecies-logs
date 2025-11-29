# 🎮 Prophecies Raid Analyzer

Application Next.js pour analyser et comparer les soirées de raid World of Warcraft via l'API WarcraftLogs.

## ✨ Fonctionnalités

- **Comparaison multi-soirées** : Comparez jusqu'à 4 rapports de raid sur le même boss
- **Analyse des morts** : Identifiez qui meurt, à quel moment et par quelle ability
- **Détection du wipe call** : Distingue automatiquement les morts avant/après le call de wipe
- **Statistiques globales** : Taux de réussite, morts moyennes, abilities les plus mortelles
- **Timeline des morts** : Visualisez chronologiquement toutes les morts de chaque tentative

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Configuration

1. **Installez les dépendances** :
```bash
npm install
```

2. **Configurez vos credentials** dans `.env.local` :
```env
WARCRAFTLOGS_CLIENT_ID=votre_client_id
WARCRAFTLOGS_CLIENT_SECRET=votre_client_secret
```

> Pour obtenir vos credentials, créez une application sur https://www.warcraftlogs.com/api/clients

### Lancement

```bash
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

## 📖 Utilisation

1. **Ajoutez des rapports** : Collez le code d'un rapport WarcraftLogs (la partie après `/reports/` dans l'URL)
   - Exemple : pour `https://www.warcraftlogs.com/reports/abc123xyz`, le code est `abc123xyz`

2. **Sélectionnez un boss** : Choisissez le boss que vous souhaitez analyser

3. **Lancez la comparaison** : L'application analysera toutes les tentatives et affichera :
   - Les statistiques globales (kills, wipes, taux de réussite)
   - Les abilities les plus mortelles
   - Une comparaison par soirée
   - Le détail chronologique des morts

## 🔧 Architecture

```
prophecies-logs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── report/[code]/route.ts
│   │   │   └── compare/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── ReportInput.tsx
│   │   ├── BossSelector.tsx
│   │   ├── ComparisonResults.tsx
│   │   └── LoadingOverlay.tsx
│   ├── lib/
│   │   ├── warcraftlogs.ts
│   │   └── analysis.ts
│   └── types/
│       └── index.ts
├── package.json
└── .env.local
```

## 🎯 Détection du Wipe Call

L'algorithme détecte automatiquement le moment probable du wipe call en cherchant :
- Une cascade de 5+ morts en moins de 10 secondes
- Survenant après 50% de la durée du fight

Les morts après le wipe call sont affichées en grisé et ne sont pas comptées dans les statistiques.

## 🛡️ API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/report/{code}` | Récupère les infos d'un rapport |
| `POST /api/compare` | Compare un boss sur plusieurs rapports |

## 🚀 Déploiement sur Vercel

### Méthode 1 : Via l'interface Vercel (Recommandé)

1. **Pousse ton code sur GitHub** :
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/prophecies-logs.git
git push -u origin main
```

2. **Va sur [vercel.com](https://vercel.com)** et connecte-toi avec GitHub

3. **Clique "Add New Project"** et importe ton repo

4. **Configure les variables d'environnement** dans les settings du projet :
   - `WARCRAFTLOGS_CLIENT_ID` = `a075fc07-fb1f-4968-a77e-c5195830b684`
   - `WARCRAFTLOGS_CLIENT_SECRET` = `osZ4qWiimy8Tn5vQH5wTDNSnf7eJ66JU2bAgBY4l`

5. **Déploie !** Vercel va builder automatiquement et te donner une URL

### Méthode 2 : Via CLI

```bash
npm i -g vercel
vercel
```

Suis les instructions et ajoute les variables d'environnement quand demandé.

## 📝 Technologies

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styles
- **Framer Motion** - Animations
- **WarcraftLogs API v2** - Données de raid (GraphQL)
