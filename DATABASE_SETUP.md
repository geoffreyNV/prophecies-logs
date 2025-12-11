# 🗄️ Configuration de la Base de Données

## Architecture

L'application utilise **Prisma** avec **SQLite** pour mettre en cache les données WarcraftLogs.

### Avantages
- ✅ Réduction des appels API (rate limits)
- ✅ Performance améliorée (données locales)
- ✅ Cache intelligent (1h par défaut)
- ✅ Pas besoin de serveur DB (SQLite = fichier)
- ✅ Facile à migrer vers PostgreSQL plus tard

## Installation

### 1. Les dépendances sont déjà installées

```bash
npm install prisma @prisma/client
```

### 2. Configuration de la base de données

Le fichier `.env.local` doit contenir :

```env
DATABASE_URL="file:./prisma/dev.db"
```

### 3. Créer la base de données

```bash
npx prisma migrate dev --name init
```

### 4. Générer le client Prisma

```bash
npx prisma generate
```

## Utilisation

### Dans le code

Au lieu d'appeler directement l'API :

```typescript
// ❌ Avant
const report = await getReport(reportCode);

// ✅ Maintenant
const report = await getCachedReport(reportCode);
```

### Cache automatique

- Les rapports sont mis en cache pendant **1 heure**
- Les analyses de morts sont mises en cache pendant **1 heure**
- Après expiration, les données sont rechargées depuis l'API

## Migration vers PostgreSQL (optionnel)

Si tu veux utiliser PostgreSQL en production :

1. Change le provider dans `prisma/schema.prisma` :
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Mets à jour `.env.local` :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/prophecies-logs"
```

3. Lance la migration :
```bash
npx prisma migrate dev
```

## Commandes utiles

- `npx prisma studio` - Interface graphique pour voir les données
- `npx prisma migrate dev` - Créer une nouvelle migration
- `npx prisma generate` - Régénérer le client après modification du schema
- `npx prisma db push` - Pousser les changements sans migration

## Structure de la base

- **Report** : Rapports WarcraftLogs
- **Fight** : Combats dans un rapport
- **Death** : Morts des joueurs
- **DeathAnalysis** : Analyses mises en cache
- **Spell** : Traductions des sorts
- **Player** : Informations sur les joueurs

