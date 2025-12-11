# 🌐 Déploiement Vercel via Interface Web (Sans Git)

## Méthode la plus simple : Interface Web Vercel

### Étape 1 : Préparer le build

```bash
npm run build
```

### Étape 2 : Déployer via l'interface web

1. **Va sur** https://vercel.com/dashboard
2. **Clique sur** "Add New..." → "Project"
3. **Choisis** "Deploy" (sans GitHub)
4. **Upload** ton dossier `.next` ou tout le projet
   - Ou utilise le drag & drop
   - Ou zip le projet et upload le zip

### Étape 3 : Configurer les variables d'environnement

Dans le projet Vercel → **Settings** → **Environment Variables** :

Ajoute :
- `WARCRAFTLOGS_CLIENT_ID` = `a075fc07-fb1f-4968-a77e-c5195830b684`
- `WARCRAFTLOGS_CLIENT_SECRET` = `osZ4qWiimy8Tn5vQH5wTDNSnf7eJ66JU2bAgBY4l`

Sélectionne **Production**, **Preview**, et **Development**

### Étape 4 : Redéployer

Après avoir ajouté les variables, redéploie depuis le dashboard.

## Avantages

✅ Pas de problème de permissions Git
✅ Interface simple
✅ Configuration visuelle
✅ Pas besoin de CLI

