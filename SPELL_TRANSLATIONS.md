# 📖 Système de Traduction des Sorts

## Fonctionnalités

✅ **Tooltips style WoWHead** : Au survol, affiche le nom traduit, la description et un lien vers WoWHead
✅ **Traductions en français** : Les noms de sorts sont traduits automatiquement
✅ **Icônes des sorts** : Affichage des icônes depuis WoWHead
✅ **Intégration complète** : Tous les sorts affichés dans l'interface ont maintenant des tooltips

## Comment ajouter des traductions

### Méthode 1 : Ajout manuel dans `src/lib/wowhead-translations.ts`

```typescript
const spellTranslations: Record<string, SpellTranslation> = {
  'Nom du sort en anglais': { 
    name: 'Nom traduit en français', 
    description: 'Description du sort',
    spellId: 123456 // Optionnel : ID du sort pour le lien WoWHead
  },
};
```

### Méthode 2 : Récupérer depuis WoWHead

1. Va sur https://www.wowhead.com
2. Recherche le sort
3. Note le nom français et l'ID du sort (dans l'URL : `spell=123456`)
4. Ajoute-le dans `spellTranslations`

### Méthode 3 : Utiliser l'API WoWHead (futur)

Un système automatique pourrait être ajouté pour récupérer les traductions depuis l'API WoWHead, mais cela nécessiterait un proxy car WoWHead n'a pas d'API publique CORS.

## Où sont utilisés les tooltips ?

- ✅ Liste des sorts qui ont tué un joueur
- ✅ Classement des sorts les plus mortels
- ✅ Combos fatals (joueur + sort)
- ✅ Morts critiques dans les tableaux
- ✅ Premiers morts de chaque wipe

## Personnalisation

Le style du tooltip peut être modifié dans `src/components/SpellTooltip.tsx` :
- Couleurs : Actuellement style WoWHead (fond sombre, bordures dorées)
- Position : S'affiche au-dessus par défaut, s'ajuste automatiquement
- Contenu : Nom, description, icône, lien WoWHead

