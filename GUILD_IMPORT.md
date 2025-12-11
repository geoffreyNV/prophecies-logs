# 📥 Import Automatique des Logs de Guilde

## Configuration

L'application peut maintenant importer automatiquement les logs de la guilde **Prophecies** sur **Hyjal (EU)**.

## Protection contre les doublons

✅ **Contraintes uniques** dans la base de données :
- `Report.code` est unique → Un rapport ne peut être importé qu'une fois
- `Fight.reportId + fightId` est unique → Un combat ne peut être dupliqué
- `Death.fightId + timestamp + playerId` → Les morts sont uniques

✅ **Vérifications avant import** :
- Vérifie si le rapport existe déjà avant d'appeler l'API
- Skip automatique des rapports déjà présents

## Utilisation

### Import automatique (3 derniers mois)

```bash
# Via l'API
GET /api/guild/import?months=3
```

### Import personnalisé

```bash
POST /api/guild/import
Content-Type: application/json

{
  "guildName": "Prophecies",
  "serverSlug": "hyjal",
  "serverRegion": "EU",
  "monthsBack": 3
}
```

## Fonctionnalités

1. **Import des rapports** : Récupère tous les rapports de la guilde
2. **Import des combats** : Importe tous les fights de chaque rapport
3. **Analyse automatique** : Analyse les morts de chaque combat
4. **Cache intelligent** : Les données sont mises en cache pendant 1h

## Structure de la base

- **Report** : Un rapport = une soirée de raid
- **Fight** : Un combat = un boss
- **Death** : Une mort = un joueur mort
- **DeathAnalysis** : Analyse mise en cache d'un combat

## Commandes utiles

```bash
# Voir les données dans Prisma Studio
npx prisma studio

# Vérifier les rapports importés
npx prisma studio
# Puis aller dans l'onglet "Report"
```

## Prochaines étapes

- [ ] Ajouter un cron job pour importer automatiquement chaque jour
- [ ] Interface web pour déclencher l'import
- [ ] Statistiques sur les imports

